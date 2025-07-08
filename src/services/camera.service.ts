import { PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";
import { CameraInfo, CameraStreamResponse, CameraCapabilities, CameraControlInput, CameraCommandResponse } from "../types/camera";
import Mux from "@mux/mux-node";
import {Server} from "socket.io";
import prisma from "../config/database";


const mux = new Mux({
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
});

let io: Server | null = null;

export function setSocketInstance(socket: Server) {
    io = socket;
}

export class CameraService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma
    }


    async verifyCameraDevice(serialNumber: string, clientIp: string): Promise<CameraInfo | null> {
        try {
            const device = await this.prisma.devices.findFirst({
                where: { serial_number: serialNumber, is_deleted: false },
                include: { device_templates: true, firmware: true },
            });

            if (!device) {
                console.log(`❌ Device not found for ${serialNumber}`);
                return null;
            }

            let streamKey = (device.attribute as any)?.mux_stream_key;
            let playbackId = (device.attribute as any)?.mux_playback_id;

            if (!streamKey || !playbackId) {
                const liveStream = await mux.video.liveStreams.create({
                    playback_policy: ["public"],
                    new_asset_settings: { playback_policy: ["public"] },
                    latency_mode: "standard",
                });
                streamKey = liveStream.stream_key;

                // Fix: Add null checking for playback_ids
                if (!liveStream.playback_ids || liveStream.playback_ids.length === 0) {
                    console.error(`❌ No playback IDs returned for ${serialNumber}`);
                    return null;
                }
                playbackId = liveStream.playback_ids[0].id;

                await this.prisma.devices.update({
                    where: { serial_number: serialNumber },
                    data: {
                        attribute: {
                            ...(device.attribute as object || {}),
                            ip_address: clientIp,
                            mux_stream_key: streamKey,
                            mux_playback_id: playbackId,
                            last_seen: new Date().toISOString(),
                        },
                        link_status: "online",
                        updated_at: new Date(),
                    },
                });
            }

            return {
                serialNumber,
                ip_address: clientIp,
                public_url: `https://stream.mux.com/${playbackId}.m3u8`,
                status: "online",
                account_id: device.account_id || "",
                attribute: device.attribute,
            };
        } catch (err) {
            console.log(`❌ Error in verifyCameraDevice for ${serialNumber}: ${err}`);
            return null;
        }
    }

    async uploadFrameToMux(serialNumber: string, frameBuffer: Buffer): Promise<any> {
        try {
            // Fix: Change 'input' to 'inputs' to match Mux API
            const asset = await mux.video.assets.create({
                inputs: [{ url: `data:image/jpeg;base64,${frameBuffer.toString("base64")}` }],
                playback_policy: ["public"],
            });
            return asset;
        } catch (err) {
            console.error(`Error uploading frame for ${serialNumber}:`, err);
            throw err;
        }
    }

    async updateCameraStatus(serialNumber: string, status: string): Promise<void> {
        await this.prisma.devices.update({
            where: { serial_number: serialNumber },
            data: { link_status: status, updated_at: new Date() },
        });
    }

    async getCameraInfo(serial_number: string): Promise<CameraInfo> {
        const device = await this.prisma.devices.findFirst({
            where: { serial_number, is_deleted: false },
            include: { device_templates: true, firmware: true },
        });

        if (!device) {
            throwError(ErrorCodes.NOT_FOUND, "Camera not found");
            throw new Error("Camera not found");
        }

        const public_url = (device.attribute as any)?.mux_playback_id
            ? `https://stream.mux.com/${(device.attribute as any).mux_playback_id}.m3u8`
            : null;

        return {
            serialNumber: device.serial_number,
            ip_address: (device.attribute as any)?.ip_address || "192.168.1.100",
            public_url,
            status: device.link_status || "unknown",
            account_id: device.account_id || "",
            attribute: device.attribute,
        };
    }

    async checkCameraAccess(serial_number: string, account_id: string): Promise<void> {
        const device = await this.prisma.devices.findFirst({
            where: { serial_number, is_deleted: false },
        });

        if (!device) {
            throwError(ErrorCodes.NOT_FOUND, "Camera not found");
            throw new Error("Camera not found");
        }

        if (device.account_id !== account_id) {
            throwError(ErrorCodes.FORBIDDEN, "You do not have access to this camera");
            throw new Error("Access denied");
        }
    }

    async generateStreamToken(serial_number: string, accountId: string): Promise<CameraStreamResponse> {
        await this.checkCameraAccess(serial_number, accountId);
        const token = Buffer.from(`${serial_number}:${accountId}:${Date.now()}`).toString("base64");
        const camera = await this.getCameraInfo(serial_number);

        return {
            success: true,
            streamUrl: camera.public_url || `/api/camera/stream/${serial_number}?token=${token}`,
            proxyUrl: `/api/camera/stream/${serial_number}?token=${token}`,
            token,
            expires: new Date(Date.now() + 3600000),
        };
    }

    async sendCameraCommand(serial_number: string, input: CameraControlInput): Promise<CameraCommandResponse> {
        try {
            const { action, params } = input;
            const requestId = Date.now().toString();

            if (io)   io.of("/camera").to(`camera:${serial_number}`).emit("command", {
                action,
                params,
                serialNumber: serial_number,
                requestId,
                timestamp: new Date().toISOString(),
            });

            return new Promise((resolve) => {
                if (io) io.of("/camera").once(`response:${requestId}`, (response) => {
                    resolve({
                        success: response.success,
                        result: response.result,
                        timestamp: new Date().toISOString(),
                    });
                });
                setTimeout(() => {
                    resolve({
                        success: false,
                        result: null,
                        timestamp: new Date().toISOString(),
                    });
                }, 5000);
            });
        } catch (error) {
            console.error("Error in sendCameraCommand:", error);
            return {
                success: false,
                result: null,
                timestamp: new Date().toISOString(),
            };
        }
    }

    async getCameraCapabilities(serial_number: string): Promise<CameraCapabilities> {
        const device = await this.prisma.devices.findFirst({
            where: { serial_number, is_deleted: false },
            include: { device_templates: true, firmware: true },
        });

        if (!device) {
            throwError(ErrorCodes.NOT_FOUND, "Camera not found");
            throw new Error("Camera not found");
        }

        const baseCapabilities = (device.device_templates?.base_capabilities as any) || {
            capabilities: ["STREAMING", "PHOTO_CAPTURE"],
        };
        const runtimeCapabilities = (device.runtime_capabilities as any) || {};

        return {
            base: baseCapabilities,
            runtime: runtimeCapabilities,
            firmware_version: device.firmware?.version || null,
            firmware_id: device.firmware_id || null,
            merged_capabilities: this.mergeCapabilities(baseCapabilities, runtimeCapabilities),
        };
    }

    private mergeCapabilities(base: any, runtime: any): string[] {
        const baseCaps = base.capabilities || [];
        const runtimeCaps = runtime.capabilities || [];
        return [...new Set([...baseCaps, ...runtimeCaps])];
    }
}