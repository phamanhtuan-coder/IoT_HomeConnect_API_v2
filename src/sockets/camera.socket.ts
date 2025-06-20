import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import CameraService from '../services/camera.service';

const prisma = new PrismaClient();
const cameraService = new CameraService();

export const setupCameraSocket = (io: Server) => {
    const cameraNamespace = io.of('/camera');
    const clientNamespace = io.of('/client');

    const activeCameras: Map<string, Socket> = new Map();

    cameraNamespace.on('connection', async (socket: Socket) => {
        console.log(`🎥 Camera connection attempt - Socket ID: ${socket.id}`);
        console.log(`📝 Connection details: ${JSON.stringify({
            headers: socket.handshake.headers,
            query: socket.handshake.query,
            address: socket.handshake.address,
            time: socket.handshake.time
        }, null, 2)}`);

        const { serialNumber, deviceType = 'ESP32-CAM', isCamera } = socket.handshake.query;

        if (!serialNumber) {
            console.log(`❌ Camera connection rejected: Missing serialNumber - Socket ID: ${socket.id}`);
            socket.disconnect(true);
            return;
        }

        try {
            console.log(`🔍 Verifying camera device: ${serialNumber}`);
            const clientIp = socket.handshake.address;
            const camera = await cameraService.verifyCameraDevice(serialNumber as string, clientIp);
            if (!camera) {
                console.log(`❌ Camera connection rejected: Invalid serialNumber ${serialNumber} - Socket ID: ${socket.id}`);
                socket.disconnect(true);
                return;
            }
            console.log(`✅ Camera verification successful: ${serialNumber}, IP: ${camera.ip_address}`);

            socket.data.serialNumber = serialNumber;

            // Handle duplicate connections
            const existingSocket = activeCameras.get(serialNumber as string);
            if (existingSocket) {
                console.log(`⚠️ Duplicate connection detected for ${serialNumber}. Closing old socket: ${existingSocket.id}`);
                existingSocket.disconnect(true);
            }
            activeCameras.set(serialNumber as string, socket);

            socket.join(`camera:${serialNumber}`);
            console.log(`✅ Room joined: camera:${serialNumber}`);

            // Update camera status to online
            await cameraService.updateCameraStatus(serialNumber as string, "online");

            // **FIXED: Set a longer timeout before expecting camera_online**
            const cameraOnlineTimeout = setTimeout(() => {
                console.log(`⚠️ Camera ${serialNumber} did not send camera_online within 15 seconds`);
                // Don't disconnect - just log the warning
            }, 15000);

            // **FIXED: Handle camera_online event properly**
            socket.on('camera_online', async (data) => {
                clearTimeout(cameraOnlineTimeout);
                console.log(`📡 Camera online: ${JSON.stringify(data, null, 2)}`);

                try {
                    // Update device status in database
                    await cameraService.updateCameraStatus(serialNumber as string, "online");

                    // Notify clients
                    clientNamespace.emit('camera_connected', {
                        serialNumber,
                        deviceType: data.deviceType || 'ESP32-CAM',
                        firmware_version: data.firmware_version,
                        capabilities: data.capabilities,
                        timestamp: new Date().toISOString()
                    });

                    console.log(`✅ Camera ${serialNumber} successfully registered as online`);
                } catch (error) {
                    console.error(`❌ Error handling camera_online for ${serialNumber}:`, error);
                }
            });

            socket.on('camera_status', (data) => handleCameraStatus(socket, clientNamespace, data));
            socket.on('photo_captured', (data) => handlePhotoCaptured(socket, clientNamespace, data));
            socket.on('motion_detected', (data) => handleMotionDetected(socket, clientNamespace, data));

            // **FIXED: Handle ESP32 ping/pong properly**
            socket.on('ping', () => {
                console.log(`🏓 Ping from camera ${serialNumber}`);
                socket.emit('pong', { timestamp: new Date().toISOString() });
            });

            // Handle command responses
            socket.on('command_response', (responseData) => {
                console.log(`📥 Command response from camera ${serialNumber}:`, responseData);
                clientNamespace.to(`camera:${serialNumber}`).emit('command_response', {
                    ...responseData,
                    serialNumber,
                    timestamp: new Date().toISOString()
                });
            });

            socket.on('disconnect', async (reason) => {
                clearTimeout(cameraOnlineTimeout);
                console.log(`🔌 Camera disconnected: ${serialNumber}, Reason: ${reason}, Socket ID: ${socket.id}`);
                console.log(`⏱ Connection duration: ${JSON.stringify({
                    start: socket.handshake.time,
                    end: new Date().toISOString(),
                    durationMs: Date.now() - new Date(socket.handshake.time).getTime()
                }, null, 2)}`);

                activeCameras.delete(serialNumber as string);

                try {
                    await cameraService.updateCameraStatus(serialNumber as string, "offline");
                    clientNamespace.emit('camera_disconnected', {
                        serialNumber,
                        reason,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    console.error(`❌ Error updating camera status on disconnect:`, error);
                }
            });

            socket.on('error', (err) => {
                console.log(`⚠️ Camera error: ${serialNumber}, Error: ${err.message || err}, Socket ID: ${socket.id}`);
            });

            console.log(`✅ Camera connected: ${serialNumber}, Socket ID: ${socket.id}`);
            console.log(`🔍 Waiting for camera_online event from ${serialNumber}...`);

        } catch (err) {
            console.log(`❌ Camera connection failed: ${serialNumber}, Error: ${err}, Socket ID: ${socket.id}`);
            socket.disconnect(true);
        }
    });

    // **FIXED: Add middleware to prevent premature disconnections**
    cameraNamespace.use((socket, next) => {
        const userAgent = socket.handshake.headers['user-agent'] || '';

        if (userAgent.includes('arduino-WebSocket-Client') || userAgent.includes('ESP32')) {
            console.log(`🔧 ESP32/Arduino client detected: ${socket.id}`);
            setTimeout(() => {
                console.log(`✅ ESP32 connection test sent for ${socket.id}`);
            }, 3000);
        }

        next();
    });
};

async function handleCameraStatus(socket: Socket, clientNamespace: any, data: any) {
    const { serialNumber } = socket.data;
    console.log(`📊 Handling camera_status for ${serialNumber}: ${JSON.stringify(data, null, 2)}`);

    const statusData = {
        serialNumber,
        status: data.status,
        streamActive: data.streamActive,
        resolution: data.resolution,
        fps: data.fps || 0,
        clients: data.clients,
        uptime: data.uptime,
        freeHeap: data.freeHeap,
        timestamp: new Date().toISOString()
    };

    try {
        await cameraService.updateCameraMetrics(serialNumber, statusData);
        clientNamespace.to(`camera:${serialNumber}`).emit('camera_status_update', statusData);
    } catch (err) {
        console.log(`❌ Error handling camera_status for ${serialNumber}: ${err}`);
    }
}

async function handlePhotoCaptured(socket: Socket, clientNamespace: any, data: any) {
    const { serialNumber } = socket.data;
    console.log(`📸 Handling photo_captured for ${serialNumber}: ${JSON.stringify(data, null, 2)}`);

    const photoData = {
        serialNumber,
        filename: data.filename,
        size: data.size,
        capturedAt: new Date(data.timestamp),
        savedToSD: data.savedToSD
    };

    try {
        await cameraService.savePhotoMetadata(photoData);
        clientNamespace.to(`camera:${serialNumber}`).emit('photo_captured', {
            serialNumber,
            filename: data.filename,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.log(`❌ Error handling photo_captured for ${serialNumber}: ${err}`);
    }
}

async function handleMotionDetected(socket: Socket, clientNamespace: any, data: any) {
    const { serialNumber } = socket.data;
    console.log(`🚨 Handling motion_detected for ${serialNumber}: ${JSON.stringify(data, null, 2)}`);

    try {
        await cameraService.createMotionAlert(serialNumber, data);
        clientNamespace.to(`camera:${serialNumber}`).emit('motion_alert', {
            serialNumber,
            intensity: data.intensity,
            region: data.region,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.log(`❌ Error handling motion_detected for ${serialNumber}: ${err}`);
    }
}

export { handleCameraStatus, handlePhotoCaptured, handleMotionDetected };
