import { Server as SocketIOServer, Socket } from "socket.io";
import { CameraService } from "../services/camera.service";

export class CameraSocket {
    private io: SocketIOServer;
    private cameraService: CameraService;

    constructor(io: SocketIOServer) {
        this.io = io;
        this.cameraService = new CameraService();
        this.setupSocketListeners();
    }

    private setupSocketListeners() {
        this.io.of("/camera").on("connection", (socket: Socket) => {
            const serialNumber = socket.handshake.query.serialNumber as string;
            if (serialNumber) {
                socket.join(`camera:${serialNumber}`);
                console.log(`Camera ${serialNumber} connected`);
            }

            socket.on("camera_online", async (data) => {
                const { serialNumber, ip_address } = data;
                try {
                    const cameraInfo = await this.cameraService.verifyCameraDevice(serialNumber, ip_address);
                    if (cameraInfo) {
                        console.log(`Camera ${serialNumber} verified, Mux stream created`);
                    }
                } catch (err) {
                    console.error(`Error verifying camera ${serialNumber}:`, err);
                }
            });

            socket.on("stream_frame", async (data) => {
                const { serialNumber, data: frameBase64, timestamp } = data;
                try {
                    const frameBuffer = Buffer.from(frameBase64, "base64");
                    const asset = await this.cameraService.uploadFrameToMux(serialNumber, frameBuffer);
                    this.io.of("/camera").to(`camera:${serialNumber}`).emit("client_stream_frame", {
                        serialNumber,
                        playbackId: asset.playback_ids[0].id,
                        timestamp,
                    });
                } catch (err) {
                    console.error(`Error uploading frame for ${serialNumber}:`, err);
                }
            });

            socket.on("command_response", (data) => {
                const { requestId, success, result } = data;
                this.io.of("/camera").emit(`response:${requestId}`, { success, result });
            });

            socket.on("photo_captured", (data) => {
                const { serialNumber, filename, size, timestamp } = data;
                console.log(`Photo captured by ${serialNumber}: ${filename} (${size} bytes)`);
                // Optionally notify clients or store in database
            });

            socket.on("camera_status", (data) => {
                const { serialNumber, status, streamActive, resolution, quality, clients, uptime, freeHeap, timestamp } = data;
                console.log(`Camera ${serialNumber} status: ${status}, uptime: ${uptime}s, heap: ${freeHeap}`);
                // Optionally update database or notify clients
            });

            socket.on("disconnect", () => {
                console.log(`Camera ${serialNumber} disconnected`);
                // Update camera status in database if needed
                this.cameraService.updateCameraStatus(serialNumber, "offline");
            });
        });
    }
}