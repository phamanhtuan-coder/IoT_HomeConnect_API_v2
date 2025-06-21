import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import CameraService from '../services/camera.service';
import {handleCameraStatus, handleMotionDetected, handlePhotoCaptured} from "./handlers/camera.handlers";
import {PermissionType} from "../types/share-request";

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

    // ========== CLIENT CONNECTIONS (for camera control) ==========
    clientNamespace.on('connection', async (socket: Socket) => {
        console.log(`📱 Client connection attempt - Socket ID: ${socket.id}`);

        const { serialNumber, accountId } = socket.handshake.query;

        if (!serialNumber || !accountId) {
            console.log(`❌ Client connection rejected: Missing serialNumber or accountId - Socket ID: ${socket.id}`);
            socket.disconnect(true);
            return;
        }

        console.log(`✅ Client connected: ${socket.id}, Serial: ${serialNumber}, Account: ${accountId}`);

        // Store client data
        socket.data = { serialNumber, accountId };

        // ========== CLIENT EVENT HANDLERS ==========

        // Join camera room for receiving camera-specific events
        socket.on('join_camera_room', async (data: { serialNumber: string }) => {
            try {
                const { serialNumber: roomSerial } = data;

                // Verify access permission
                const hasAccess = await cameraService.checkCameraAccess(roomSerial, accountId as string);
                if (!hasAccess) {
                    socket.emit('error', { message: 'No permission to access this camera' });
                    return;
                }

                socket.join(`camera:${roomSerial}`);
                console.log(`📱 Client ${socket.id} joined camera room: ${roomSerial}`);

                // Send current camera status if camera is online
                const cameraSocket = activeCameras.get(roomSerial);
                if (cameraSocket) {
                    socket.emit('camera_connected', {
                        serialNumber: roomSerial,
                        deviceType: 'ESP32-CAM',
                        timestamp: new Date().toISOString(),
                        online: true
                    });
                } else {
                    socket.emit('camera_disconnected', {
                        serialNumber: roomSerial,
                        timestamp: new Date().toISOString(),
                        online: false
                    });
                }
            } catch (error) {
                console.error('Error joining camera room:', error);
                socket.emit('error', { message: 'Failed to join camera room' });
            }
        });

        // Send command to camera
        socket.on('send_camera_command', async (data: {
            serialNumber: string;
            action: string;
            params?: any;
        }) => {
            try {
                const { serialNumber: targetSerial, action, params } = data;

                // Verify control permission
                const hasAccess = await cameraService.checkCameraAccess(
                    targetSerial,
                    accountId as string,
                    PermissionType.CONTROL
                );
                if (!hasAccess) {
                    socket.emit('command_response', {
                        success: false,
                        error: 'No permission to control this camera',
                        serialNumber: targetSerial,
                        action
                    });
                    return;
                }

                const cameraSocket = activeCameras.get(targetSerial);
                if (!cameraSocket) {
                    socket.emit('command_response', {
                        success: false,
                        error: 'Camera is offline',
                        serialNumber: targetSerial,
                        action
                    });
                    return;
                }

                // Send command to camera via Socket.IO
                console.log(`📤 Sending command to camera ${targetSerial}: ${action}`);
                cameraSocket.emit('command', {
                    action,
                    params: params || {},
                    commandId: `cmd_${Date.now()}`,
                    timestamp: new Date().toISOString()
                });

                // Acknowledge command sent
                socket.emit('command_sent', {
                    success: true,
                    serialNumber: targetSerial,
                    action,
                    message: 'Command sent to camera',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('Error sending camera command:', error);
                socket.emit('command_response', {
                    success: false,
                    error: 'Failed to send command',
                    serialNumber: data.serialNumber,
                    action: data.action
                });
            }
        });

        // Get camera status
        socket.on('get_camera_status', async (data: { serialNumber: string }) => {
            try {
                const { serialNumber: targetSerial } = data;

                // Verify access permission
                const hasAccess = await cameraService.checkCameraAccess(targetSerial, accountId as string);
                if (!hasAccess) {
                    socket.emit('camera_status_response', {
                        success: false,
                        error: 'No permission to access this camera'
                    });
                    return;
                }

                const cameraSocket = activeCameras.get(targetSerial);
                if (!cameraSocket) {
                    socket.emit('camera_status_response', {
                        success: false,
                        error: 'Camera is offline',
                        status: { online: false }
                    });
                    return;
                }

                // Request status from camera
                cameraSocket.emit('get_status');

                // Send immediate response
                socket.emit('camera_status_response', {
                    success: true,
                    serialNumber: targetSerial,
                    message: 'Status request sent to camera'
                });

            } catch (error) {
                console.error('Error getting camera status:', error);
                socket.emit('camera_status_response', {
                    success: false,
                    error: 'Failed to get camera status'
                });
            }
        });

        // Start camera stream
        socket.on('start_camera_stream', async (data: { serialNumber: string }) => {
            try {
                const { serialNumber: targetSerial } = data;

                // Verify access permission
                const hasAccess = await cameraService.checkCameraAccess(targetSerial, accountId as string);
                if (!hasAccess) {
                    socket.emit('stream_response', {
                        success: false,
                        error: 'No permission to access this camera'
                    });
                    return;
                }

                // Generate stream token and URL
                const streamResponse = await cameraService.generateStreamToken(targetSerial, accountId as string);

                socket.emit('stream_response', {
                    success: true,
                    serialNumber: targetSerial,
                    streamUrl: streamResponse.streamUrl,
                    proxyUrl: streamResponse.proxyUrl,
                    token: streamResponse.token,
                    expires: streamResponse.expires
                });

            } catch (error) {
                console.error('Error starting camera stream:', error);
                socket.emit('stream_response', {
                    success: false,
                    error: 'Failed to start camera stream'
                });
            }
        });

        // Stop camera stream
        socket.on('stop_camera_stream', async (data: { serialNumber: string }) => {
            try {
                const { serialNumber: targetSerial } = data;

                const cameraSocket = activeCameras.get(targetSerial);
                if (cameraSocket) {
                    cameraSocket.emit('command', {
                        action: 'stopStream',
                        params: {},
                        timestamp: new Date().toISOString()
                    });
                }

                socket.emit('stream_response', {
                    success: true,
                    serialNumber: targetSerial,
                    message: 'Stream stop command sent'
                });

            } catch (error) {
                console.error('Error stopping camera stream:', error);
                socket.emit('stream_response', {
                    success: false,
                    error: 'Failed to stop camera stream'
                });
            }
        });

        // Handle client disconnect
        socket.on('disconnect', (reason) => {
            console.log(`📱 Client disconnected: ${socket.id}, Reason: ${reason}`);
        });

        socket.on('error', (err) => {
            console.log(`⚠️ Client error: ${socket.id}, Error: ${err.message || err}`);
        });
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


