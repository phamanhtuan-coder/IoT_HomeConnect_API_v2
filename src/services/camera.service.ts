import { PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";
import { CameraInfo, CameraStreamResponse, CameraCapabilities, CameraControlInput, CameraCommandResponse } from "../types/camera";
import Mux from "@mux/mux-node";
import { Server } from "socket.io";
import prisma from "../config/database";
import axios from 'axios';

const mux = new Mux({
    tokenId: process.env.MUX_TOKEN_ID || "",
    tokenSecret: process.env.MUX_TOKEN_SECRET || "",
});

let io: Server | null = null;

export function setSocketInstance(socket: Server) {
    io = socket;
}

export class CameraService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma;
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
            let liveStreamId = (device.attribute as any)?.mux_live_stream_id;

            // Create live stream if not exists
            if (!streamKey || !playbackId || !liveStreamId) {
                const liveStream = await mux.video.liveStreams.create({
                    playback_policy: ["public"],
                    new_asset_settings: { playback_policy: ["public"] },
                    latency_mode: "low", // Use low latency for real-time
                    max_continuous_duration: 43200, // 12 hours max
                });

                streamKey = liveStream.stream_key;
                liveStreamId = liveStream.id;

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
                            mux_live_stream_id: liveStreamId,
                            last_seen: new Date().toISOString(),
                        },
                        link_status: "online",
                        updated_at: new Date(),
                    },
                });

                // Send stream key to ESP32
                if (io) {
                    io.of("/camera").to(`camera:${serialNumber}`).emit("command", {
                        action: "setStreamKey",
                        params: { streamKey },
                        serialNumber,
                        requestId: `streamkey_${Date.now()}`,
                        timestamp: new Date().toISOString(),
                    });
                }
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

    // REMOVE this method - don't upload individual frames
    // Instead, ESP32 should stream directly to Mux RTMP endpoint
    async startDirectRTMPStream(serialNumber: string): Promise<boolean> {
        try {
            const device = await this.prisma.devices.findFirst({
                where: { serial_number: serialNumber, is_deleted: false },
            });

            if (!device) return false;

            const streamKey = (device.attribute as any)?.mux_stream_key;
            if (!streamKey) return false;

            // Send RTMP URL to ESP32
            if (io) {
                io.of("/camera").to(`camera:${serialNumber}`).emit("command", {
                    action: "startRTMPStream",
                    params: {
                        rtmpUrl: `rtmp://global-live.mux.com:5222/live/${streamKey}`
                    },
                    serialNumber,
                    requestId: `rtmp_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                });
            }

            return true;
        } catch (err) {
            console.error(`Error starting RTMP stream for ${serialNumber}:`, err);
            return false;
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

    // Enhanced token generation with better security
    async generateStreamToken(serial_number: string, accountId: string): Promise<CameraStreamResponse> {
        await this.checkCameraAccess(serial_number, accountId);

        const tokenData = {
            serialNumber: serial_number,
            accountId,
            timestamp: Date.now(),
            nonce: Math.random().toString(36).substring(2)
        };

        const token = Buffer.from(JSON.stringify(tokenData)).toString("base64");
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
            const requestId = `${action}_${Date.now()}_${Math.random().toString(36).substring(2)}`;

            if (io) {
                io.of("/camera").to(`camera:${serial_number}`).emit("command", {
                    action,
                    params,
                    serialNumber: serial_number,
                    requestId,
                    timestamp: new Date().toISOString(),
                });
            }

            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve({
                        success: false,
                        result: { error: "Command timeout" },
                        timestamp: new Date().toISOString(),
                    });
                }, 10000); // Increased timeout

                if (io) {
                    const responseHandler = (response: any) => {
                        clearTimeout(timeout);
                        resolve({
                            success: response.success,
                            result: response.result,
                            timestamp: new Date().toISOString(),
                        });
                    };

                    io.of("/camera").once(`response:${requestId}`, responseHandler);
                }
            });
        } catch (error: any) {
            console.error("Error in sendCameraCommand:", error);
            return {
                success: false,
                result: { error: error?.message || 'Unknown error occurred' },
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
            capabilities: ["STREAMING", "PHOTO_CAPTURE", "FACE_DETECTION", "MOTION_DETECTION"],
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

    // Add face detection capability
    async enableFaceDetection(serial_number: string, enabled: boolean): Promise<CameraCommandResponse> {
        return this.sendCameraCommand(serial_number, {
            action: "setFaceDetection",
            params: { enabled }
        });
    }
}