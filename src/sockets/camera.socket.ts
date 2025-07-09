import { Server as SocketIOServer, Socket } from "socket.io";
import { CameraService } from "../services/camera.service";

export class CameraSocket {
    private io: SocketIOServer;
    private cameraService: CameraService;
    private activeConnections = new Map<string, string>(); // serialNumber -> socketId

    constructor(io: SocketIOServer) {
        this.io = io;
        this.cameraService = new CameraService();
        this.setupSocketListeners();
    }

    private setupSocketListeners() {
        this.io.of("/camera").on("connection", (socket: Socket) => {
            const serialNumber = socket.handshake.query.serialNumber as string;

            if (!serialNumber) {
                console.log("❌ Camera connection rejected: Missing serial number");
                socket.disconnect();
                return;
            }

            // Prevent duplicate connections
            const existingConnection = this.activeConnections.get(serialNumber);
            if (existingConnection && this.io.of("/camera").sockets.get(existingConnection)) {
                console.log(`⚠️ Disconnecting duplicate camera connection: ${serialNumber}`);
                this.io.of("/camera").sockets.get(existingConnection)?.disconnect();
            }

            socket.join(`camera:${serialNumber}`);
            this.activeConnections.set(serialNumber, socket.id);
            console.log(`📹 Camera ${serialNumber} connected (${socket.id})`);

            socket.on("camera_online", async (data) => {
                const { serialNumber, ip_address, firmware_version, capabilities } = data;

                if (!serialNumber || !ip_address) {
                    console.log("❌ Invalid camera_online data");
                    return;
                }

                try {
                    const cameraInfo = await this.cameraService.verifyCameraDevice(serialNumber, ip_address);
                    if (cameraInfo) {
                        console.log(`✅ Camera ${serialNumber} verified, Mux stream configured`);

                        // Update device capabilities
                        await this.updateDeviceCapabilities(serialNumber, capabilities);

                        // Notify successful connection
                        socket.emit("camera_verified", {
                            success: true,
                            playback_url: cameraInfo.public_url,
                            capabilities: capabilities
                        });
                    } else {
                        socket.emit("camera_verified", { success: false, error: "Device verification failed" });
                    }
                } catch (err) {
                    console.error(`❌ Error verifying camera ${serialNumber}:`, err);
                    socket.emit("camera_verified", { success: false, error: "Verification error" });
                }
            });

            // Remove frame upload - cameras should stream directly to RTMP
            // socket.on("stream_frame", ...) - REMOVED

            socket.on("command_response", (data) => {
                const { requestId, success, result } = data;

                if (!requestId) {
                    console.log("❌ Command response missing requestId");
                    return;
                }

                console.log(`📝 Command response ${requestId}: ${success ? 'SUCCESS' : 'FAILED'}`);
                this.io.of("/camera").emit(`response:${requestId}`, { success, result });
            });

            socket.on("photo_captured", (data) => {
                const { serialNumber, filename, size, timestamp, faces, triggeredByMotion } = data;
                console.log(`📸 Photo captured by ${serialNumber}: ${filename} (${size} bytes)${faces ? ` - ${faces.count} faces detected` : ''}`);

                // Notify clients with face detection data
                this.io.of("/camera").to(`camera:${serialNumber}`).emit("photo_notification", {
                    serialNumber,
                    filename,
                    size,
                    timestamp,
                    faces,
                    triggeredByMotion,
                    downloadUrl: `/api/camera/photos/${serialNumber}/${filename}`
                });
            });

            socket.on("camera_status", (data) => {
                const {
                    serialNumber,
                    status,
                    streamActive,
                    resolution,
                    quality,
                    clients,
                    uptime,
                    freeHeap,
                    timestamp,
                    capabilities
                } = data;

                console.log(`📊 Camera ${serialNumber} status: ${status}, uptime: ${uptime}s, heap: ${freeHeap} KB`);

                // Update database with latest status
                this.cameraService.updateCameraStatus(serialNumber, status);

                // Notify clients about status update
                this.io.of("/camera").to(`camera:${serialNumber}`).emit("status_update", {
                    serialNumber,
                    status,
                    streamActive,
                    resolution,
                    quality,
                    uptime,
                    freeHeap,
                    capabilities,
                    timestamp
                });
            });

            socket.on("face_detected", (data) => {
                const { serialNumber, faces, timestamp, confidence } = data;
                console.log(`👤 Face detection by ${serialNumber}: ${faces.length} face(s) detected`);

                // Notify clients about face detection
                this.io.of("/camera").to(`camera:${serialNumber}`).emit("face_detection", {
                    serialNumber,
                    faces,
                    timestamp,
                    confidence
                });
            });

            socket.on("motion_detected", (data) => {
                const { serialNumber, timestamp, sensitivity } = data;
                console.log(`🏃 Motion detected by ${serialNumber} at ${timestamp}`);

                // Notify clients about motion detection
                this.io.of("/camera").to(`camera:${serialNumber}`).emit("motion_detection", {
                    serialNumber,
                    timestamp,
                    sensitivity
                });
            });

            socket.on("error", (error) => {
                console.error(`❌ Camera ${serialNumber} error:`, error);
            });

            socket.on("disconnect", () => {
                console.log(`📵 Camera ${serialNumber} disconnected`);
                this.activeConnections.delete(serialNumber);

                // Update camera status in database
                this.cameraService.updateCameraStatus(serialNumber, "offline");

                // Notify clients about disconnection
                this.io.of("/camera").emit("camera_disconnected", {
                    serialNumber,
                    timestamp: new Date().toISOString()
                });
            });
        });
    }

    private async updateDeviceCapabilities(serialNumber: string, capabilities: any) {
        try {
            // Update device capabilities in database if needed
            // This would depend on your database schema
            console.log(`🔧 Updating capabilities for ${serialNumber}:`, capabilities);
        } catch (err) {
            console.error(`❌ Error updating capabilities for ${serialNumber}:`, err);
        }
    }

    // Method to send commands to specific camera
    public sendCommandToCamera(serialNumber: string, command: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const requestId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2)}`;
            const timeout = setTimeout(() => {
                reject(new Error("Command timeout"));
            }, 15000);

            this.io.of("/camera").once(`response:${requestId}`, (response) => {
                clearTimeout(timeout);
                resolve(response);
            });

            this.io.of("/camera").to(`camera:${serialNumber}`).emit("command", {
                ...command,
                requestId,
                timestamp: new Date().toISOString()
            });
        });
    }

    // Method to check if camera is connected
    public isCameraConnected(serialNumber: string): boolean {
        const socketId = this.activeConnections.get(serialNumber);
        return socketId ? this.io.of("/camera").sockets.has(socketId) : false;
    }

    // Method to get connected cameras
    public getConnectedCameras(): string[] {
        return Array.from(this.activeConnections.keys()).filter(serial =>
            this.isCameraConnected(serial)
        );
    }

    // Method to broadcast to all cameras
    public broadcastToAllCameras(event: string, data: any) {
        this.io.of("/camera").emit(event, data);
    }
}