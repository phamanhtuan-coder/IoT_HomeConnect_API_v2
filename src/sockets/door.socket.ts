// src/sockets/door.socket.ts - ESP-01 Safety & Crash Prevention
import { Server, Socket } from 'socket.io';
import prisma from '../config/database';
import { DoorService } from '../services/door.service';

const doorService = new DoorService();

/**
 * Detect device type with enhanced ESP-01 safety
 */
const detectDeviceType = (socket: Socket): { isESP8266: boolean; isGateway: boolean; isESP01: boolean; deviceType: string } => {
    const userAgent = socket.handshake.headers['user-agent'] || '';
    const query = socket.handshake.query;

    const isESP8266 = userAgent.includes('ESP01S-ServoController') ||
        userAgent.includes('ESP8266') ||
        userAgent.includes('ESP8266-DoorController') ||
        query.isIoTDevice === 'true';

    const isGateway = userAgent.includes('ESP-Gateway') ||
        userAgent.includes('Gateway') ||
        query.gateway_managed === 'true';

    // NEW: Detect ESP-01 specifically (more limited device)
    const isESP01 = userAgent.includes('ESP-01') ||
        socket.handshake.headers['x-esp-device'] === 'ESP-01' ||
        query.device_type === 'ESP-01';

    let deviceType = 'Unknown';
    if (isGateway) {
        deviceType = 'ESP Gateway';
    } else if (isESP01) {
        deviceType = 'ESP-01 Direct'; // ESP-01 has special handling
    } else if (isESP8266) {
        deviceType = 'ESP8266 Direct';
    }

    return { isESP8266, isGateway, isESP01, deviceType };
};

export const setupDoorSocket = (io: Server) => {
    // Enhanced connection handling with ESP-01 safety
    io.on('connection', async (socket: Socket) => {
        const { serialNumber, isIoTDevice, accountId, gateway_managed } = socket.handshake.query as {
            serialNumber?: string;
            isIoTDevice?: string;
            accountId?: string;
            gateway_managed?: string;
        };

        const { isESP8266, isGateway, isESP01, deviceType } = detectDeviceType(socket);

        // ✅ HANDLE ESP DEVICES with ESP-01 specific safety
        if ((isESP8266 || isGateway || isESP01) && serialNumber && isIoTDevice === 'true' && !accountId) {
            console.log(`[DOOR] ${deviceType} Device detected - Socket ID: ${socket.id}`);
            console.log(`[DOOR] ${deviceType} params:`, { serialNumber, isIoTDevice, gateway_managed });

            try {
                // ✅ FOR GATEWAY: No database validation needed
                if (isGateway) {
                    console.log(`[GATEWAY] ${serialNumber} connecting as Gateway/Hub`);

                    socket.data = {
                        serialNumber,
                        isIoTDevice: true,
                        isESP8266: false,
                        isGateway: true,
                        isESP01: false,
                        deviceType,
                        gateway_managed: false,
                        connectedAt: new Date()
                    };

                    socket.join(`gateway:${serialNumber}`);
                    console.log(`[GATEWAY] ${serialNumber} joined room gateway:${serialNumber}`);

                    // Enhanced welcome with safety timeout
                    setTimeout(() => {
                        try {
                            socket.emit('connection_welcome', {
                                status: 'connected',
                                namespace: 'main-gateway',
                                serialNumber,
                                deviceType,
                                gateway_managed: false,
                                esp01_safety: true, // NEW: Safety flag
                                timestamp: new Date().toISOString()
                            });
                            console.log(`[GATEWAY] Welcome message sent to ${serialNumber}`);
                        } catch (error) {
                            console.error(`[GATEWAY] Welcome send failed for ${serialNumber}:`, error);
                        }
                    }, 1500); // Increased delay for ESP-01 stability

                    setupGatewayEventHandlers(socket, io, serialNumber);
                    console.log(`[GATEWAY] ${serialNumber} fully connected as Gateway/Hub`);
                    return;
                }

                // ✅ FOR ESP DEVICES: Database validation with ESP-01 safety
                console.log(`[DEVICE] Looking up ${deviceType} ${serialNumber} in database...`);

                // Add timeout for database operations to prevent ESP-01 timeout
                const device = await Promise.race([
                    prisma.devices.findFirst({
                        where: { serial_number: serialNumber, is_deleted: false },
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Database timeout')), 5000)
                    )
                ]).catch(err => {
                    console.error(`[DEVICE] Database error for ${serialNumber}:`, err);
                    throw new Error(`Database operation failed: ${err.message}`);
                });

                if (!device) {
                    console.error(`[DEVICE] Device ${serialNumber} not found in database`);

                    // ESP-01 safe error response
                    socket.emit('connection_error', {
                        code: 'DEVICE_NOT_FOUND',
                        message: 'Device not registered',
                        esp01_safe: true // Signal that this is ESP-01 compatible
                    });

                    // Delayed disconnect for ESP-01 stability
                    setTimeout(() => socket.disconnect(true), 1000);
                    return;
                }

                console.log(`[DEVICE] ${deviceType} ${serialNumber} found, account: ${(device as any).account_id}`);

                // Set socket data with ESP-01 flags
                socket.data = {
                    serialNumber,
                    isIoTDevice: true,
                    isESP8266: !isESP01, // ESP-01 is not ESP8266
                    isGateway: false,
                    isESP01: isESP01,
                    deviceType,
                    gateway_managed: gateway_managed === 'true',
                    connectedAt: new Date(),
                    esp01_mode: isESP01 // Special handling flag
                };

                socket.join(`door:${serialNumber}`);
                console.log(`[DEVICE] ${serialNumber} joined room door:${serialNumber}`);

                // ✅ UPDATE DATABASE: ESP-01 safe metadata update
                const updateData: any = {
                    updated_at: new Date(),
                    runtime_capabilities: {
                        ...(device as any).runtime_capabilities as any,
                        last_socket_connection: new Date().toISOString(),
                        connection_type: gateway_managed === 'true' ? 'gateway' :
                            isESP01 ? 'esp01_direct' : 'esp8266_direct',
                        socket_connected: true,
                        device_type: deviceType,
                        esp01_mode: isESP01
                    }
                };

                if (gateway_managed === 'true') {
                    updateData.hub_id = serialNumber;
                }

                // Non-blocking database update for ESP-01
                prisma.devices.update({
                    where: { serial_number: serialNumber },
                    data: updateData
                }).then(() => {
                    console.log(`[DEVICE] Metadata updated for ${serialNumber}`);
                }).catch(err => {
                    console.error(`[DEVICE] Metadata update failed for ${serialNumber}:`, err);
                });

                // ESP-01 safe welcome message with longer delay
                const welcomeDelay = isESP01 ? 3000 : 2000; // ESP-01 needs more time
                setTimeout(() => {
                    try {
                        socket.emit('connection_welcome', {
                            status: 'connected',
                            namespace: isESP01 ? 'main-esp01' : 'main-door',
                            serialNumber,
                            deviceType,
                            gateway_managed: gateway_managed === 'true',
                            link_status: (device as any).link_status,
                            esp01_mode: isESP01,
                            safety_enabled: true,
                            timestamp: new Date().toISOString()
                        });
                        console.log(`[DEVICE] Welcome sent to ${deviceType} ${serialNumber}`);
                    } catch (error) {
                        console.error(`[DEVICE] Welcome failed for ${serialNumber}:`, error);
                    }
                }, welcomeDelay);

                // Setup device handlers with ESP-01 awareness
                if (isESP01) {
                    setupESP01EventHandlers(socket, io, serialNumber, device as any);
                } else {
                    setupDeviceEventHandlers(socket, io, serialNumber, device as any);
                }

                console.log(`[DEVICE] ${deviceType} ${serialNumber} fully connected`);

            } catch (error) {
                console.error(`[ERROR] Critical setup error for ${deviceType} ${serialNumber}:`, error);

                try {
                    socket.emit('connection_error', {
                        code: 'SETUP_ERROR',
                        message: (error as Error)?.message || 'Setup failed',
                        deviceType,
                        esp01_safe: true,
                        timestamp: new Date().toISOString()
                    });
                } catch (emitError) {
                    console.error(`[ERROR] Error emit failed for ${serialNumber}:`, emitError);
                }

                setTimeout(() => socket.disconnect(true), 2000);
            }

            return;
        }
    });

    // ============= CLIENT NAMESPACE WITH ESP-01 SAFETY =============
    const clientNamespace = io.of('/client');

    clientNamespace.on('connection', async (socket: Socket) => {
        const { serialNumber, accountId } = socket.handshake.query as {
            serialNumber?: string;
            accountId?: string;
        };

        if (serialNumber && accountId) {
            console.log(`[CLIENT] Client connected for door ${serialNumber} by user ${accountId}`);

            socket.join(`door:${serialNumber}`);

            // Enhanced door command with ESP-01 safety
            socket.on('door_command', (commandData) => {
                try {
                    console.log(`[CMD] Door command from client for ${serialNumber}:`, commandData);

                    // ESP-01 safe command with reduced data
                    const safeCommand = {
                        action: commandData.action,
                        serialNumber: serialNumber,
                        fromClient: accountId,
                        esp01_safe: true, // Flag for ESP-01 compatibility
                        timestamp: new Date().toISOString()
                    };

                    // Send to device with ESP-01 consideration
                    io.emit('command', safeCommand);

                    // Client acknowledgment
                    socket.emit('door_command_sent', {
                        success: true,
                        serialNumber,
                        command: commandData,
                        esp01_compatible: true,
                        timestamp: new Date().toISOString()
                    });

                    console.log(`[CMD] ESP-01 safe command sent to ${serialNumber}`);
                } catch (error) {
                    console.error(`[CMD] Command error for ${serialNumber}:`, error);

                    socket.emit('door_command_error', {
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        serialNumber,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            socket.on('disconnect', () => {
                console.log(`[CLIENT] Client disconnected from door ${serialNumber} (user: ${accountId})`);
            });
        }
    });

    console.log('[INIT] Door socket setup completed with ESP-01 safety features');
};

// ============= ESP-01 SPECIFIC EVENT HANDLERS =============
function setupESP01EventHandlers(socket: Socket, io: Server, serialNumber: string, device: any) {
    const clientNamespace = io.of('/client');

    console.log(`[ESP-01] Setting up ESP-01 specific handlers for ${serialNumber}`);

    // ESP-01 safe device_online handler
    socket.on('device_online', async (data) => {
        try {
            console.log(`[ESP-01] Device online from ${serialNumber}:`, data);

            // ESP-01 safe acknowledgment
            socket.emit('device_online_ack', {
                status: 'received',
                deviceType: 'ESP-01 Direct',
                esp01_mode: true,
                timestamp: new Date().toISOString()
            });

            // Client notification with ESP-01 info
            clientNamespace.emit('device_connect', {
                serialNumber,
                deviceType: 'ESP-01 DOOR CONTROLLER',
                connectionType: 'esp01_direct',
                link_status: device.link_status,
                esp01_mode: true,
                capabilities: ['door_control', 'status_reporting'],
                timestamp: new Date().toISOString()
            });

            console.log(`[ESP-01] Device online processed for ${serialNumber}`);
        } catch (error) {
            console.error(`[ESP-01] Error in device_online for ${serialNumber}:`, error);
        }
    });

    // ESP-01 safe command response handler
    socket.on('command_response', (data) => {
        try {
            console.log(`[ESP-01] Command response from ${serialNumber}:`, data);

            clientNamespace.to(`door:${serialNumber}`).emit('door_command_response', {
                serialNumber,
                ...data,
                deviceType: 'ESP-01 Direct',
                esp01_processed: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP-01] Error in command_response for ${serialNumber}:`, error);
        }
    });

    // ESP-01 safe status handler
    socket.on('deviceStatus', (data) => {
        try {
            console.log(`[ESP-01] Status from ${serialNumber}:`, data);

            clientNamespace.to(`door:${serialNumber}`).emit('door_status', {
                ...data,
                deviceType: 'ESP-01 Direct',
                connectionType: 'esp01_direct',
                esp01_mode: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP-01] Error in deviceStatus for ${serialNumber}:`, error);
        }
    });

    // ESP-01 safe heartbeat with acknowledgment
    socket.on('heartbeat', (data) => {
        try {
            console.log(`[ESP-01] Heartbeat from ${serialNumber}:`, data);

            socket.emit('heartbeat_ack', {
                received: true,
                deviceType: 'ESP-01 Direct',
                esp01_mode: true,
                server_time: new Date().toISOString(),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP-01] Error in heartbeat for ${serialNumber}:`, error);
        }
    });

    // ESP-01 safe disconnect handler
    socket.on('disconnect', async (reason) => {
        console.log(`[ESP-01] Device ${serialNumber} disconnected. Reason: ${reason}`);

        try {
            // Safe database update for ESP-01
            await prisma.devices.update({
                where: { serial_number: serialNumber },
                data: {
                    updated_at: new Date(),
                    runtime_capabilities: {
                        ...device.runtime_capabilities as any,
                        last_socket_disconnection: new Date().toISOString(),
                        socket_connected: false,
                        esp01_last_disconnect: reason,
                        esp01_mode: true
                    }
                }
            }).catch(err => {
                console.error(`[ESP-01] Database update failed on disconnect:`, err);
            });

            clientNamespace.emit('door_disconnect', {
                serialNumber,
                deviceType: 'ESP-01 Direct',
                esp01_mode: true,
                reason: reason,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error(`[ESP-01] Error in disconnect handler for ${serialNumber}:`, error);
        }
    });
}

// ============= GATEWAY EVENT HANDLERS (Enhanced for ESP-01) =============
function setupGatewayEventHandlers(socket: Socket, io: Server, gatewayId: string) {
    const clientNamespace = io.of('/client');

    socket.on('device_online', async (data) => {
        try {
            console.log(`[GATEWAY] Device online from ${gatewayId}:`, data);

            socket.emit('device_online_ack', {
                status: 'received',
                deviceType: 'ESP Gateway',
                esp01_support: true, // Gateway supports ESP-01 devices
                timestamp: new Date().toISOString()
            });

            // Enhanced gateway notification with ESP-01 info
            clientNamespace.emit('gateway_online', {
                gatewayId,
                managed_doors: data.managed_doors || [],
                esp01_capable: true,
                gateway_type: 'ESP8266_ESP01_BRIDGE',
                timestamp: new Date().toISOString()
            });

            console.log(`[GATEWAY] Device online processed for ${gatewayId}`);
        } catch (error) {
            console.error(`[GATEWAY] Error in device_online for ${gatewayId}:`, error);
        }
    });

    // [Rest of gateway handlers remain the same but with enhanced ESP-01 support]
    socket.on('welcome_ack', (data) => {
        try {
            console.log(`[GATEWAY] Welcome ack from ${gatewayId}:`, data);
            console.log(`[GATEWAY] Gateway ready for ESP-01 management`);
        } catch (error) {
            console.error(`[GATEWAY] Error in welcome_ack for ${gatewayId}:`, error);
        }
    });

    socket.on('command_response', (data) => {
        try {
            console.log(`[GATEWAY] Command response from ${gatewayId}:`, data);

            if (data.deviceId || data.serialNumber) {
                const targetSerial = data.deviceId || data.serialNumber;
                clientNamespace.to(`door:${targetSerial}`).emit('door_command_response', {
                    serialNumber: targetSerial,
                    ...data,
                    deviceType: 'ESP Gateway',
                    gateway_processed: true,
                    esp01_via_gateway: true,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`[GATEWAY] Error in command_response for ${gatewayId}:`, error);
        }
    });

    socket.on('deviceStatus', (data) => {
        try {
            console.log(`[GATEWAY] Device status from ${gatewayId}:`, data);

            if (data.deviceId || data.serialNumber) {
                const targetSerial = data.deviceId || data.serialNumber;
                clientNamespace.to(`door:${targetSerial}`).emit('door_status', {
                    ...data,
                    deviceType: 'ESP Gateway',
                    connectionType: 'gateway',
                    esp01_via_gateway: true,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`[GATEWAY] Error in deviceStatus for ${gatewayId}:`, error);
        }
    });

    socket.on('heartbeat', (data) => {
        try {
            console.log(`[GATEWAY] Heartbeat from ${gatewayId}:`, data);
            socket.emit('heartbeat_ack', {
                received: true,
                deviceType: 'ESP Gateway',
                esp01_support: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GATEWAY] Error in heartbeat for ${gatewayId}:`, error);
        }
    });

    socket.on('disconnect', async (reason) => {
        console.log(`[GATEWAY] Gateway ${gatewayId} disconnected. Reason: ${reason}`);

        try {
            clientNamespace.emit('gateway_disconnect', {
                gatewayId,
                impact: 'ESP-01 controllers may lose connectivity',
                esp01_affected: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GATEWAY] Error in disconnect for ${gatewayId}:`, error);
        }
    });
}

// ============= STANDARD DEVICE EVENT HANDLERS =============
function setupDeviceEventHandlers(socket: Socket, io: Server, serialNumber: string, device: any) {
    const clientNamespace = io.of('/client');

    socket.on('device_online', async (data) => {
        try {
            console.log(`[DEVICE] Device online from ${serialNumber}:`, data);

            socket.emit('device_online_ack', {
                status: 'received',
                deviceType: 'ESP8266 Direct',
                timestamp: new Date().toISOString()
            });

            clientNamespace.emit('device_connect', {
                serialNumber,
                deviceType: data.deviceType || 'SERVO_DOOR_CONTROLLER',
                connectionType: 'direct',
                link_status: device.link_status,
                timestamp: new Date().toISOString()
            });

            console.log(`[DEVICE] Device online processed for ${serialNumber}`);
        } catch (error) {
            console.error(`[DEVICE] Error in device_online for ${serialNumber}:`, error);
        }
    });

    socket.on('command_response', (data) => {
        try {
            console.log(`[DEVICE] Command response from ${serialNumber}:`, data);

            clientNamespace.to(`door:${serialNumber}`).emit('door_command_response', {
                serialNumber,
                ...data,
                deviceType: 'ESP8266 Direct',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[DEVICE] Error in command_response for ${serialNumber}:`, error);
        }
    });

    socket.on('deviceStatus', (data) => {
        try {
            console.log(`[DEVICE] Device status from ${serialNumber}:`, data);

            clientNamespace.to(`door:${serialNumber}`).emit('door_status', {
                ...data,
                deviceType: 'ESP8266 Direct',
                connectionType: 'direct',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[DEVICE] Error in deviceStatus for ${serialNumber}:`, error);
        }
    });

    // Missing code fragment for setupDeviceEventHandlers disconnect handler
// This goes in the disconnect event handler for standard ESP8266 devices

    socket.on('disconnect', async (reason) => {
        console.log(`[DEVICE] Device ${serialNumber} disconnected. Reason: ${reason}`);

        try {
            await prisma.devices.update({
                where: {serial_number: serialNumber},
                data: {
                    updated_at: new Date(),
                    runtime_capabilities: {
                        ...device.runtime_capabilities as any,
                        last_socket_disconnection: new Date().toISOString(),
                        socket_connected: false,
                        disconnection_reason: reason,
                        device_type: 'ESP8266 Direct',
                        last_seen: new Date().toISOString(),
                        connection_duration: device.runtime_capabilities?.last_socket_connection ?
                            new Date().getTime() - new Date(device.runtime_capabilities.last_socket_connection).getTime() : 0
                    }
                }
            }).catch(err => {
                console.error(`[DEVICE] Database update failed on disconnect for ${serialNumber}:`, err);
            });

            // Notify clients about disconnection
            clientNamespace.emit('door_disconnect', {
                serialNumber,
                deviceType: 'ESP8266 Direct',
                reason: reason,
                timestamp: new Date().toISOString(),
                connection_lost: true,
                device_capabilities: {
                    can_reconnect: true,
                    supports_auto_recovery: true
                }
            });

            console.log(`[DEVICE] Cleanup completed for disconnected device ${serialNumber}`);

        } catch (error) {
            console.error(`[DEVICE] Error handling disconnect for ${serialNumber}:`, error);

            // Fallback notification even if database update fails
            try {
                clientNamespace.emit('door_disconnect', {
                    serialNumber,
                    deviceType: 'ESP8266 Direct',
                    reason: 'disconnect_with_error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                });
            } catch (notifyError) {
                console.error(`[DEVICE] Failed to notify clients about disconnect:`, notifyError);
            }
        }
    });
}