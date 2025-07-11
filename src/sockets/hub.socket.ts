// src/sockets/hub.socket.ts
import { Server, Socket } from 'socket.io';
import prisma from '../config/database';
import {
    setupDoorDeviceHandlers,
    setupDoorHubHandlers,
    setupESP01EventHandlers,
    createEnhancedCommand
} from './handlers/door.handlers';

export const setupHubSocket = (io: Server) => {
    console.log('[HUB] Initializing Hub Socket...');

    io.on('connection', async (socket: Socket) => {
        const {
            serialNumber,
            isIoTDevice,
            accountId,
            hub_managed,
            optimized
        } = socket.handshake.query as {
            serialNumber?: string;
            isIoTDevice?: string;
            accountId?: string;
            hub_managed?: string;
            optimized?: string;
        };

        const userAgent = socket.handshake.headers['user-agent'] || '';

        // Detect device type
        const isHub = userAgent.includes('ESP-Hub-Opt') ||
            hub_managed === 'true' ||
            optimized === 'true';

        const isESP01 = userAgent.includes('ESP-01') ||
            socket.handshake.headers['x-esp-device'] === 'ESP-01';

        const isDevice = userAgent.includes('ESP8266') ||
            userAgent.includes('ESP-01') ||
            isIoTDevice === 'true';

        // Handle ESP Socket Hub
        if (isHub && serialNumber && isIoTDevice === 'true' && !accountId) {
            console.log(`[HUB] ESP Socket Hub connecting: ${serialNumber}`);

            try {
                // Verify device exists
                const device = await prisma.devices.findFirst({
                    where: { serial_number: serialNumber, is_deleted: false }
                });

                if (!device) {
                    console.error(`[HUB] Device ${serialNumber} not found`);
                    socket.emit('connection_error', { message: 'Device not registered' });
                    socket.disconnect(true);
                    return;
                }

                // Set socket data
                socket.data = {
                    serialNumber,
                    deviceType: 'ESP_SOCKET_HUB',
                    isHub: true
                };

                // Join rooms
                await socket.join(`hub:${serialNumber}`);
                await socket.join(`device:${serialNumber}`);

                console.log(`[HUB] ${serialNumber} connected successfully`);

                // Setup handlers
                setupDoorHubHandlers(socket, io, serialNumber);

            } catch (error) {
                console.error(`[HUB] Setup error for ${serialNumber}:`, error);
                socket.emit('connection_error', { message: 'Setup failed' });
                socket.disconnect(true);
            }

            return;
        }

        // Handle ESP01/ESP8266 Devices
        if (isDevice && serialNumber && isIoTDevice === 'true' && !accountId) {
            console.log(`[DEVICE] ESP Device connecting: ${serialNumber}`);

            try {
                // Verify device exists
                const device = await prisma.devices.findFirst({
                    where: { serial_number: serialNumber, is_deleted: false }
                });

                if (!device) {
                    console.error(`[DEVICE] Device ${serialNumber} not found`);
                    socket.emit('connection_error', { message: 'Device not registered' });
                    socket.disconnect(true);
                    return;
                }

                // Set socket data
                socket.data = {
                    serialNumber,
                    deviceType: isESP01 ? 'ESP_01_DEVICE' : 'ESP_8266_DEVICE',
                    isDevice: true,
                    isESP01: isESP01
                };

                // Join rooms
                await socket.join(`door:${serialNumber}`);
                await socket.join(`device:${serialNumber}`);

                console.log(`[DEVICE] ${serialNumber} connected successfully`);

                // Setup handlers based on device type
                if (isESP01) {
                    setupESP01EventHandlers(socket, io, serialNumber, device);
                } else {
                    setupDoorDeviceHandlers(socket, io, serialNumber);
                }

            } catch (error) {
                console.error(`[DEVICE] Setup error for ${serialNumber}:`, error);
                socket.emit('connection_error', { message: 'Setup failed' });
                socket.disconnect(true);
            }

            return;
        }
    });

    // Client namespace for mobile/web apps
    const clientNamespace = io.of('/client');

    clientNamespace.on('connection', async (socket: Socket) => {
        const { serialNumber, accountId } = socket.handshake.query as {
            serialNumber?: string;
            accountId?: string;
        };

        console.log(`[CLIENT] New client connection attempt...`);
        console.log(`[CLIENT] Query params:`, { serialNumber, accountId });

        if (serialNumber && accountId) {
            console.log(`[CLIENT] ✅ Client connected for ${serialNumber} by user ${accountId}`);

            // Join client room
            await socket.join(`door:${serialNumber}`);
            console.log(`[CLIENT] Joined room: door:${serialNumber}`);

            // Handle door commands from clients
            socket.on('door_command', async (commandData) => {
                try {
                    console.log(`[CLIENT] 📨 Door command received for ${serialNumber}:`, commandData);

                    const targetSerial = commandData.serialNumber || serialNumber;

                    // Create enhanced command
                    const doorCommand = createEnhancedCommand(
                        commandData.action,
                        targetSerial,
                        commandData.state || {},
                        commandData.door_type || "SERVO"
                    );

                    console.log(`[CLIENT] 🔄 Created door command:`, doorCommand);

                    // Send to device or hub
                    const deviceRoom = io.sockets.adapter.rooms.get(`device:${serialNumber}`);
                    const hubRoom = io.sockets.adapter.rooms.get(`hub:${serialNumber}`);

                    console.log(`[CLIENT] 🔍 Checking rooms:`, {
                        deviceRoom: deviceRoom?.size || 0,
                        hubRoom: hubRoom?.size || 0
                    });

                    if (hubRoom && hubRoom.size > 0) {
                        // Send via hub
                        io.to(`hub:${serialNumber}`).emit('command', doorCommand);
                        console.log(`[CLIENT] ✅ Command sent via hub to ${serialNumber}`);
                    } else if (deviceRoom && deviceRoom.size > 0) {
                        // Send directly to device
                        io.to(`device:${serialNumber}`).emit('command', doorCommand);
                        console.log(`[CLIENT] ✅ Command sent directly to ${serialNumber}`);
                    } else {
                        // Device offline
                        console.log(`[CLIENT] ❌ Device ${targetSerial} not connected`);
                        socket.emit('door_command_error', {
                            success: false,
                            error: 'Device not connected',
                            serialNumber: targetSerial
                        });
                        return;
                    }

                    // Acknowledge command sent
                    socket.emit('door_command_sent', {
                        success: true,
                        serialNumber: targetSerial,
                        command: doorCommand,
                        timestamp: new Date().toISOString()
                    });

                    console.log(`[CLIENT] ✅ Command acknowledgment sent`);

                } catch (error) {
                    console.error(`[CLIENT] ❌ Door command error:`, error);
                    socket.emit('door_command_error', {
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        serialNumber
                    });
                }
            });

            // Handle status requests
            socket.on('door_status_request', (requestData) => {
                try {
                    const targetSerial = requestData.serialNumber || serialNumber;

                    const statusRequest = {
                        action: 'status_request',
                        serialNumber: targetSerial,
                        timestamp: new Date().toISOString()
                    };

                    // Send to device or hub
                    io.to(`device:${serialNumber}`).emit('status_request', statusRequest);
                    io.to(`hub:${serialNumber}`).emit('status_request', statusRequest);

                    console.log(`[CLIENT] Status request sent for ${targetSerial}`);
                } catch (error) {
                    console.error(`[CLIENT] Status request error:`, error);
                }
            });

            // Handle config requests
            socket.on('door_config_request', (requestData) => {
                try {
                    const targetSerial = requestData.serialNumber || serialNumber;

                    const configRequest = {
                        action: 'CFG',
                        serialNumber: targetSerial,
                        timestamp: new Date().toISOString()
                    };

                    // Send to device or hub
                    io.to(`device:${serialNumber}`).emit('command', configRequest);
                    io.to(`hub:${serialNumber}`).emit('command', configRequest);

                    console.log(`[CLIENT] Config request sent for ${targetSerial}`);
                } catch (error) {
                    console.error(`[CLIENT] Config request error:`, error);
                }
            });

            socket.on('disconnect', () => {
                console.log(`[CLIENT] Client disconnected from ${serialNumber} (user: ${accountId})`);
            });
        } else {
            console.log(`[CLIENT] ❌ Invalid client connection - missing serialNumber or accountId`);
            console.log(`[CLIENT] Received:`, { serialNumber, accountId });
            socket.disconnect(true);
        }
    });

    // Health monitoring
    setInterval(() => {
        const connectedDevices = io.sockets.adapter.rooms;
        const deviceCount = Array.from(connectedDevices.keys()).filter((room: string) => room.startsWith('device:')).length;
        const hubCount = Array.from(connectedDevices.keys()).filter((room: string) => room.startsWith('hub:')).length;

        console.log(`[MONITOR] Connected - Devices: ${deviceCount}, Hubs: ${hubCount}`);

        io.of('/client').emit('system_status', {
            connected_devices: deviceCount,
            connected_hubs: hubCount,
            timestamp: new Date().toISOString()
        });
    }, 60000); // Every minute

    console.log('[HUB] ✅ Hub Socket setup completed');
    console.log('[HUB] 🎯 Ready for ESP01 door control operations!');
};