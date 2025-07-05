import { Server, Socket } from 'socket.io';
import prisma from '../config/database';
import {
    setupESP01EventHandlers,
    setupDoorDeviceHandlers,
    setupDoorHubHandlers,
} from './handlers/door.handlers';

/**
 * Detect device type for ESP-01 system only
 */
const detectDeviceType = (socket: Socket): {
    isESP8266: boolean;
    isGateway: boolean;
    isESP01: boolean;
    isHub: boolean;
    deviceType: string
} => {
    const userAgent = socket.handshake.headers['user-agent'] || '';
    const query = socket.handshake.query;

    const isESP8266 = userAgent.includes('ESP01S-ServoController') ||
        userAgent.includes('ESP8266') ||
        userAgent.includes('ESP8266-DoorController') ||
        query.isIoTDevice === 'true';

    const isGateway = userAgent.includes('ESP-Gateway') ||
        userAgent.includes('Gateway') ||
        query.gateway_managed === 'true';

    const isHub = userAgent.includes('ESP-Hub-Opt') ||
        userAgent.includes('ESP_HUB_OPT') ||
        query.hub_managed === 'true' ||
        query.optimized === 'true';

    const isESP01 = userAgent.includes('ESP-01') ||
        socket.handshake.headers['x-esp-device'] === 'ESP-01' ||
        query.device_type === 'ESP-01';

    let deviceType = 'Unknown';
    if (isHub) {
        deviceType = 'ESP Socket Hub (Optimized)';
    } else if (isGateway) {
        deviceType = 'ESP Gateway';
    } else if (isESP01) {
        deviceType = 'ESP-01 Direct';
    } else if (isESP8266) {
        deviceType = 'ESP8266 Direct';
    }

    return { isESP8266, isGateway, isESP01, isHub, deviceType };
};

export const setupHubSocket = (io: Server) => {
    console.log('[HUB] Initializing ESP-01 Optimized Hub Socket...');

    // Enhanced connection handling for ESP-01 system
    io.on('connection', async (socket: Socket) => {
        const {
            serialNumber,
            isIoTDevice,
            accountId,
            gateway_managed,
            hub_managed,
            optimized,
            system_type
        } = socket.handshake.query as {
            serialNumber?: string;
            isIoTDevice?: string;
            accountId?: string;
            gateway_managed?: string;
            hub_managed?: string;
            optimized?: string;
            system_type?: string;
        };

        const { isESP8266, isGateway, isESP01, isHub, deviceType } = detectDeviceType(socket);

        // Determine system type
        let systemType = system_type || 'door';
        if (isHub) {
            systemType = 'hub';
        } else if (isGateway) {
            systemType = 'gateway';
        } else if (isESP01) {
            systemType = 'door';
        }

        // ✅ HANDLE ESP DEVICES ONLY
        if ((isESP8266 || isGateway || isESP01 || isHub) && serialNumber && isIoTDevice === 'true' && !accountId) {
            console.log(`[HUB] ${deviceType} Device detected - Socket ID: ${socket.id}`);
            console.log(`[HUB] ${deviceType} params:`, {
                serialNumber,
                isIoTDevice,
                gateway_managed,
                hub_managed,
                optimized
            });

            try {
                // ✅ UNIFIED DEVICE COMMAND for ESP-01 system
                socket.on('device_command', (commandData) => {
                    try {
                        console.log(`[CMD] Unified ESP-01 command from client for ${serialNumber}:`, JSON.stringify(commandData, null, 2));

                        const enhancedCommand = {
                            action: commandData.action,
                            serialNumber: serialNumber,
                            fromClient: accountId,
                            systemType: systemType,
                            esp01_safe: true,
                            optimized: true,
                            compact_data: true,
                            state: commandData.state || {},
                            timestamp: new Date().toISOString()
                        };

                        console.log(`[CMD] Sending unified ESP-01 command:`, JSON.stringify(enhancedCommand, null, 2));

                        // Route command to appropriate ESP system
                        if (systemType === 'hub') {
                            // ESP Socket Hub commands
                            io.to(`device:${serialNumber}`).emit('command', enhancedCommand);
                            io.to(`hub:${serialNumber}`).emit('command', enhancedCommand);
                            io.to(`esp-hub:${serialNumber}`).emit('command', enhancedCommand);

                        } else if (systemType === 'gateway') {
                            // ESP Gateway commands
                            io.to(`device:${serialNumber}`).emit('command', enhancedCommand);
                            io.to(`gateway:${serialNumber}`).emit('command', enhancedCommand);

                        } else {
                            // Direct ESP device commands
                            io.to(`device:${serialNumber}`).emit('command', enhancedCommand);
                        }

                        // Client acknowledgment
                        socket.emit('device_command_sent', {
                            success: true,
                            serialNumber,
                            systemType: systemType,
                            command: enhancedCommand,
                            esp01_compatible: true,
                            optimized: true,
                            timestamp: new Date().toISOString()
                        });

                        console.log(`[CMD] Unified ESP-01 command sent to ${systemType} ${serialNumber}`);
                    } catch (error) {
                        console.error(`[CMD] Unified ESP-01 command error for ${serialNumber}:`, error);

                        socket.emit('device_command_error', {
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error',
                            serialNumber,
                            systemType: systemType,
                            timestamp: new Date().toISOString()
                        });
                    }
                });

                // ✅ ESP STATUS REQUEST - Get current status of ESP devices
                socket.on('device_status_request', (requestData) => {
                    try {
                        console.log(`[STATUS] Status request for ${serialNumber}:`, requestData);

                        const statusRequest = {
                            action: 'status_request',
                            serialNumber: requestData.serialNumber || serialNumber,
                            fromClient: accountId,
                            esp01_safe: true,
                            optimized: true,
                            timestamp: new Date().toISOString()
                        };

                        // Send status request to appropriate system
                        if (systemType === 'hub') {
                            io.to(`device:${serialNumber}`).emit('status_request', statusRequest);
                            io.to(`hub:${serialNumber}`).emit('status_request', statusRequest);
                        } else if (systemType === 'gateway') {
                            io.to(`device:${serialNumber}`).emit('status_request', statusRequest);
                            io.to(`gateway:${serialNumber}`).emit('status_request', statusRequest);
                        } else {
                            io.to(`device:${serialNumber}`).emit('status_request', statusRequest);
                        }

                        console.log(`[STATUS] Status request sent to ${systemType} ${serialNumber}`);
                    } catch (error) {
                        console.error(`[STATUS] Status request error for ${serialNumber}:`, error);
                    }
                });

                // ✅ ESP HEARTBEAT REQUEST - Manual heartbeat trigger
                socket.on('heartbeat_request', (_requestData) => {
                    try {
                        console.log(`[HEARTBEAT] Heartbeat request for ${serialNumber}`);

                        const heartbeatRequest = {
                            action: 'heartbeat',
                            serialNumber: serialNumber,
                            fromClient: accountId,
                            esp01_safe: true,
                            optimized: true,
                            timestamp: new Date().toISOString()
                        };

                        // Send heartbeat request
                        if (systemType === 'hub') {
                            io.to(`device:${serialNumber}`).emit('heartbeat_request', heartbeatRequest);
                            io.to(`hub:${serialNumber}`).emit('heartbeat_request', heartbeatRequest);
                        } else if (systemType === 'gateway') {
                            io.to(`device:${serialNumber}`).emit('heartbeat_request', heartbeatRequest);
                            io.to(`gateway:${serialNumber}`).emit('heartbeat_request', heartbeatRequest);
                        } else {
                            io.to(`device:${serialNumber}`).emit('heartbeat_request', heartbeatRequest);
                        }

                        socket.emit('heartbeat_request_sent', {
                            success: true,
                            serialNumber,
                            systemType: systemType,
                            timestamp: new Date().toISOString()
                        });

                        console.log(`[HEARTBEAT] Heartbeat request sent to ${systemType} ${serialNumber}`);
                    } catch (error) {
                        console.error(`[HEARTBEAT] Heartbeat request error for ${serialNumber}:`, error);
                    }
                });

                socket.on('disconnect', () => {
                    console.log(`[CLIENT] Client disconnected from ${systemType} ${serialNumber} (user: ${accountId})`);
                });

            } catch (error) {
                console.error(`[ERROR] Critical setup error for ${deviceType} ${serialNumber}:`, error);

                try {
                    socket.emit('connection_error', {
                        code: 'SETUP_ERROR',
                        message: (error as Error)?.message || 'Setup failed',
                        deviceType,
                        esp01_safe: true,
                        optimized: true,
                        timestamp: new Date().toISOString()
                    });
                } catch (emitError) {
                    console.error(`[ERROR] Error emit failed for ${serialNumber}:`, emitError);
                }

                setTimeout(() => socket.disconnect(true), 2000);
            }

            return;
        }

        // ✅ ESP SOCKET HUB: Optimized gateway for ESP-01 doors
        if (isHub || hub_managed === 'true' || optimized === 'true') {
            if (!serialNumber) {
                console.error('[ESP-HUB] Missing serialNumber for ESP Socket Hub');
                socket.emit('connection_error', {
                    code: 'MISSING_SERIAL_NUMBER',
                    message: 'Serial number is required for ESP Socket Hub',
                    timestamp: new Date().toISOString()
                });
                socket.disconnect(true);
                return;
            }

            console.log(`[ESP-HUB] ${serialNumber} connecting as Optimized ESP Socket Hub`);

            socket.data = {
                serialNumber,
                isIoTDevice: true,
                isESP8266: true,
                isGateway: true,
                isHub: true,
                isOptimized: true,
                deviceType: 'ESP Socket Hub (Optimized)',
                systemType: 'door_hub',
                capabilities: ['esp01_gateway', 'compact_forwarding', 'optimized_bridge'],
                connectedAt: new Date()
            };

            socket.join(`hub:${serialNumber}`);
            socket.join(`device:${serialNumber}`);
            socket.join(`esp-hub:${serialNumber}`);
            console.log(`[ESP-HUB] ${serialNumber} joined hub rooms`);

            // Use optimized hub handlers
            setupDoorHubHandlers(socket, io, serialNumber);

            setTimeout(() => {
                try {
                    socket.emit('connection_welcome', {
                        status: 'connected',
                        namespace: 'esp-hub-optimized',
                        serialNumber,
                        deviceType: 'ESP Socket Hub (Optimized)',
                        optimized: true,
                        esp01_support: true,
                        capabilities: ['esp01_gateway', 'compact_forwarding'],
                        timestamp: new Date().toISOString()
                    });
                    console.log(`[ESP-HUB] Welcome sent to ${serialNumber}`);
                } catch (error) {
                    console.error(`[ESP-HUB] Welcome failed for ${serialNumber}:`, error);
                }
            }, 1000);

            console.log(`[ESP-HUB] ${serialNumber} fully connected as Optimized Hub`);
            return;
        }

        // ✅ ESP GATEWAY: ESP8266 Master managing ESP-01 slaves
        if (isGateway || gateway_managed === 'true') {
            if (!serialNumber) {
                console.error('[ESP-GW] Missing serialNumber for ESP Gateway');
                socket.emit('connection_error', {
                    code: 'MISSING_SERIAL_NUMBER',
                    message: 'Serial number is required for ESP Gateway',
                    timestamp: new Date().toISOString()
                });
                socket.disconnect(true);
                return;
            }

            console.log(`[ESP-GW] ${serialNumber} connecting as ESP Gateway`);

            socket.data = {
                serialNumber,
                isIoTDevice: true,
                isESP8266: true,
                isGateway: true,
                isHub: false,
                deviceType: 'ESP Gateway',
                systemType: 'door_gateway',
                gateway_managed: true,
                connectedAt: new Date()
            };

            socket.join(`gateway:${serialNumber}`);
            socket.join(`device:${serialNumber}`);
            console.log(`[ESP-GW] ${serialNumber} joined gateway rooms`);

            // Use gateway handlers
            setupDoorHubHandlers(socket, io, serialNumber);

            setTimeout(() => {
                try {
                    socket.emit('connection_welcome', {
                        status: 'connected',
                        namespace: 'esp-gateway',
                        serialNumber,
                        deviceType: 'ESP Gateway',
                        gateway_managed: true,
                        esp01_slaves: 7,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`[ESP-GW] Welcome sent to ${serialNumber}`);
                } catch (error) {
                    console.error(`[ESP-GW] Welcome failed for ${serialNumber}:`, error);
                }
            }, 1500);

            console.log(`[ESP-GW] ${serialNumber} fully connected as Gateway`);
            return;
        }

        // ✅ ESP-01 DIRECT: Direct ESP-01 connections
        if (!serialNumber) {
            console.error('[ESP-DEVICE] Missing serialNumber for ESP device');
            socket.emit('connection_error', {
                code: 'MISSING_SERIAL_NUMBER',
                message: 'Serial number is required for ESP device',
                timestamp: new Date().toISOString()
            });
            socket.disconnect(true);
            return;
        }

        console.log(`[ESP-DEVICE] Looking up ${deviceType} ${serialNumber} in database...`);

        try {
            const device = await Promise.race([
                prisma.devices.findFirst({
                    where: { serial_number: serialNumber, is_deleted: false },
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database timeout')), 5000)
                )
            ]).catch(err => {
                console.error(`[ESP-DEVICE] Database error for ${serialNumber}:`, err);
                throw new Error(`Database operation failed: ${err.message}`);
            });

            if (!device) {
                console.error(`[ESP-DEVICE] Device ${serialNumber} not found in database`);
                socket.emit('connection_error', {
                    code: 'DEVICE_NOT_FOUND',
                    message: 'Device not registered',
                    esp01_safe: true
                });
                setTimeout(() => socket.disconnect(true), 1000);
                return;
            }

            console.log(`[ESP-DEVICE] ${deviceType} ${serialNumber} found, account: ${(device as any).account_id}`);

            socket.data = {
                serialNumber,
                isIoTDevice: true,
                isESP8266: !isESP01,
                isGateway: false,
                isESP01: isESP01,
                deviceType,
                systemType: 'door',
                gateway_managed: gateway_managed === 'true',
                connectedAt: new Date(),
                esp01_mode: isESP01
            };

            socket.join(`door:${serialNumber}`);
            socket.join(`device:${serialNumber}`);
            console.log(`[ESP-DEVICE] ${serialNumber} joined device rooms`);

            // Update database with device metadata
            const updateData: any = {
                updated_at: new Date(),
                runtime_capabilities: {
                    ...(device as any).runtime_capabilities as any,
                    last_socket_connection: new Date().toISOString(),
                    connection_type: gateway_managed === 'true' ? 'gateway' :
                        isESP01 ? 'esp01_direct' : 'esp8266_direct',
                    socket_connected: true,
                    device_type: deviceType,
                    esp01_mode: isESP01,
                    optimized: true
                }
            };

            if (gateway_managed === 'true') {
                updateData.hub_id = serialNumber;
            }

            prisma.devices.update({
                where: { serial_number: serialNumber },
                data: updateData
            }).catch(err => {
                console.error(`[ESP-DEVICE] Metadata update failed for ${serialNumber}:`, err);
            });

            const welcomeDelay = isESP01 ? 3000 : 2000;
            setTimeout(() => {
                try {
                    socket.emit('connection_welcome', {
                        status: 'connected',
                        namespace: isESP01 ? 'esp01-door' : 'esp8266-door',
                        serialNumber,
                        deviceType,
                        gateway_managed: gateway_managed === 'true',
                        link_status: (device as any).link_status,
                        esp01_mode: isESP01,
                        optimized: true,
                        safety_enabled: true,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`[ESP-DEVICE] Welcome sent to ${deviceType} ${serialNumber}`);
                } catch (error) {
                    console.error(`[ESP-DEVICE] Welcome failed for ${serialNumber}:`, error);
                }
            }, welcomeDelay);

            // Setup device handlers based on type
            if (isESP01) {
                setupESP01EventHandlers(socket, io, serialNumber, device as any);
            } else {
                setupDoorDeviceHandlers(socket, io, serialNumber, device as any);
            }

            console.log(`[ESP-DEVICE] ${deviceType} ${serialNumber} fully connected`);

        } catch (error) {
            console.error(`[ERROR] Critical setup error for ${deviceType} ${serialNumber}:`, error);

            try {
                socket.emit('connection_error', {
                    code: 'SETUP_ERROR',
                    message: (error as Error)?.message || 'Setup failed',
                    deviceType,
                    esp01_safe: true,
                    optimized: true,
                    timestamp: new Date().toISOString()
                });
            } catch (emitError) {
                console.error(`[ERROR] Error emit failed for ${serialNumber}:`, emitError);
            }

            setTimeout(() => socket.disconnect(true), 2000);
        }
    });

    // ============= CLIENT NAMESPACE FOR ESP-01 SYSTEM =============
    const clientNamespace = io.of('/client');

    clientNamespace.on('connection', async (socket: Socket) => {
        const { serialNumber, accountId, systemType } = socket.handshake.query as {
            serialNumber?: string;
            accountId?: string;
            systemType?: string; // 'door', 'hub', 'gateway'
        };

        if (serialNumber && accountId) {
            console.log(`[CLIENT] Client connected for ${systemType || 'door'} ${serialNumber} by user ${accountId}`);

            // Join appropriate rooms based on system type
            if (systemType === 'hub') {
                socket.join(`hub:${serialNumber}`);
                socket.join(`esp-hub:${serialNumber}`);
            } else if (systemType === 'gateway') {
                socket.join(`gateway:${serialNumber}`);
            } else {
                socket.join(`door:${serialNumber}`); // Default for backward compatibility
            }

            // ✅ ESP-01 OPTIMIZED DOOR COMMAND
            socket.on('door_command', (commandData) => {
                try {
                    console.log(`[CMD] ESP-01 door command for ${serialNumber}:`, JSON.stringify(commandData, null, 2));

                    let targetSerial = serialNumber;

                    if (commandData.serialNumber && commandData.serialNumber !== serialNumber) {
                        targetSerial = commandData.serialNumber;
                        console.log(`[CMD] Command targets different device: ${targetSerial}`);
                    }

                    // Enhanced command format for ESP-01 system
                    const doorCommand = {
                        action: commandData.action,
                        serialNumber: targetSerial,
                        fromClient: accountId,
                        esp01_safe: true,
                        optimized: true,
                        compact_data: true,
                        state: commandData.state || {},
                        timestamp: new Date().toISOString()
                    };

                    console.log(`[CMD] Sending ESP-01 command to target: ${targetSerial}`);
                    console.log(`[CMD] Command data:`, JSON.stringify(doorCommand, null, 2));

                    // Check system availability
                    const roomsToCheck: string[] = [];
                    let systemName = '';

                    if (systemType === 'hub') {
                        roomsToCheck.push(`device:${serialNumber}`, `hub:${serialNumber}`, `esp-hub:${serialNumber}`);
                        systemName = 'ESP Socket Hub';
                    } else if (systemType === 'gateway') {
                        roomsToCheck.push(`device:${serialNumber}`, `gateway:${serialNumber}`);
                        systemName = 'ESP Gateway';
                    } else {
                        roomsToCheck.push(`device:${serialNumber}`);
                        systemName = 'ESP Device';
                    }

                    console.log(`[CMD] Checking ${systemName} availability...`);
                    console.log(`[CMD] Rooms: ${roomsToCheck.join(', ')}`);

                    const deviceSockets = io.sockets.adapter.rooms.get(`device:${serialNumber}`);
                    console.log(`[CMD] Device room ${serialNumber} has ${deviceSockets?.size || 0} sockets`);

                    if (!deviceSockets || deviceSockets.size === 0) {
                        console.log(`[CMD] ❌ ${systemName} ${serialNumber} not connected`);
                        socket.emit('door_command_error', {
                            success: false,
                            error: `${systemName} not connected`,
                            serialNumber: targetSerial,
                            hubSerial: serialNumber,
                            system_type: 'esp01_system',
                            available_rooms: Array.from(io.sockets.adapter.rooms.keys()).filter((room: string) => room.includes(serialNumber)),
                            timestamp: new Date().toISOString()
                        });
                        return;
                    }

                    // Send to appropriate system
                    const roomsSent: string[] = [];

                    if (targetSerial !== serialNumber) {
                        io.to(`device:${targetSerial}`).emit('command', doorCommand);
                        roomsSent.push(`device:${targetSerial}`);
                    }

                    // Send to connected system
                    if (systemType === 'hub') {
                        io.to(`device:${serialNumber}`).emit('command', doorCommand);
                        io.to(`hub:${serialNumber}`).emit('command', doorCommand);
                        io.to(`esp-hub:${serialNumber}`).emit('command', doorCommand);
                        roomsSent.push(`device:${serialNumber}`, `hub:${serialNumber}`, `esp-hub:${serialNumber}`);
                    } else if (systemType === 'gateway') {
                        io.to(`device:${serialNumber}`).emit('command', doorCommand);
                        io.to(`gateway:${serialNumber}`).emit('command', doorCommand);
                        roomsSent.push(`device:${serialNumber}`, `gateway:${serialNumber}`);
                    } else {
                        io.to(`device:${serialNumber}`).emit('command', doorCommand);
                        roomsSent.push(`device:${serialNumber}`);
                    }

                    console.log(`[CMD] ✅ Command sent to rooms: ${roomsSent.join(', ')}`);

                    socket.emit('door_command_sent', {
                        success: true,
                        serialNumber: targetSerial,
                        hubSerial: serialNumber,
                        command: doorCommand,
                        esp01_compatible: true,
                        optimized: true,
                        sent_to_rooms: roomsSent,
                        system_connected: true,
                        system_type: 'esp01_system',
                        timestamp: new Date().toISOString()
                    });

                    console.log(`[CMD] ✅ ESP-01 door command sent - System: ${serialNumber}, Target: ${targetSerial}`);
                } catch (error) {
                    console.error(`[CMD] ESP-01 door command error for ${serialNumber}:`, error);

                    socket.emit('door_command_error', {
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        serialNumber,
                        system_type: 'esp01_system',
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // ✅ ESP SYSTEM HEALTH CHECK - Monitor system health
            socket.on('system_health_check', (requestData) => {
                try {
                    console.log(`[HEALTH] System health check for ${serialNumber}`);

                    const healthRequest = {
                        action: 'health_check',
                        serialNumber: serialNumber,
                        fromClient: accountId,
                        esp01_safe: true,
                        optimized: true,
                        check_type: requestData.check_type || 'full', // 'full', 'quick', 'connection'
                        timestamp: new Date().toISOString()
                    };

                    // Send health check to appropriate system
                    if (systemType === 'hub') {
                        io.to(`device:${serialNumber}`).emit('health_check', healthRequest);
                        io.to(`hub:${serialNumber}`).emit('health_check', healthRequest);
                        io.to(`esp-hub:${serialNumber}`).emit('health_check', healthRequest);
                    } else if (systemType === 'gateway') {
                        io.to(`device:${serialNumber}`).emit('health_check', healthRequest);
                        io.to(`gateway:${serialNumber}`).emit('health_check', healthRequest);
                    } else {
                        io.to(`device:${serialNumber}`).emit('health_check', healthRequest);
                    }

                    socket.emit('system_health_check_sent', {
                        success: true,
                        serialNumber,
                        systemType: systemType || 'device',
                        check_type: requestData.check_type || 'full',
                        timestamp: new Date().toISOString()
                    });

                    console.log(`[HEALTH] Health check sent to ${systemType || 'device'} ${serialNumber}`);
                } catch (error) {
                    console.error(`[HEALTH] Health check error for ${serialNumber}:`, error);

                    socket.emit('system_health_check_error', {
                        success: false,
                        error: error instanceof Error ? error.message : 'Health check failed',
                        serialNumber,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // ✅ ESP FIRMWARE INFO REQUEST - Get firmware version and capabilities
            socket.on('firmware_info_request', (_requestData) => {
                try {
                    console.log(`[FIRMWARE] Firmware info request for ${serialNumber}`);

                    const firmwareRequest = {
                        action: 'firmware_info',
                        serialNumber: serialNumber,
                        fromClient: accountId,
                        esp01_safe: true,
                        optimized: true,
                        timestamp: new Date().toISOString()
                    };

                    // Send firmware info request
                    if (systemType === 'hub') {
                        io.to(`device:${serialNumber}`).emit('firmware_info_request', firmwareRequest);
                        io.to(`hub:${serialNumber}`).emit('firmware_info_request', firmwareRequest);
                    } else if (systemType === 'gateway') {
                        io.to(`device:${serialNumber}`).emit('firmware_info_request', firmwareRequest);
                        io.to(`gateway:${serialNumber}`).emit('firmware_info_request', firmwareRequest);
                    } else {
                        io.to(`device:${serialNumber}`).emit('firmware_info_request', firmwareRequest);
                    }

                    console.log(`[FIRMWARE] Firmware info request sent to ${systemType || 'device'} ${serialNumber}`);
                } catch (error) {
                    console.error(`[FIRMWARE] Firmware info request error for ${serialNumber}:`, error);
                }
            });

            // ✅ ESP SYSTEM RESTART - Safe restart command
            socket.on('system_restart', (requestData) => {
                try {
                    console.log(`[RESTART] System restart request for ${serialNumber}`);

                    // Validate restart authorization
                    if (!requestData.confirm || requestData.confirm !== 'CONFIRM_RESTART') {
                        socket.emit('system_restart_error', {
                            success: false,
                            error: 'Restart confirmation required',
                            serialNumber,
                            timestamp: new Date().toISOString()
                        });
                        return;
                    }

                    const restartRequest = {
                        action: 'system_restart',
                        serialNumber: serialNumber,
                        fromClient: accountId,
                        esp01_safe: true,
                        optimized: true,
                        restart_type: requestData.restart_type || 'soft', // 'soft', 'hard'
                        delay_ms: requestData.delay_ms || 5000, // 5 second delay
                        timestamp: new Date().toISOString()
                    };

                    // Send restart command with delay
                    setTimeout(() => {
                        if (systemType === 'hub') {
                            io.to(`device:${serialNumber}`).emit('system_restart', restartRequest);
                            io.to(`hub:${serialNumber}`).emit('system_restart', restartRequest);
                        } else if (systemType === 'gateway') {
                            io.to(`device:${serialNumber}`).emit('system_restart', restartRequest);
                            io.to(`gateway:${serialNumber}`).emit('system_restart', restartRequest);
                        } else {
                            io.to(`device:${serialNumber}`).emit('system_restart', restartRequest);
                        }
                    }, 2000); // 2 second delay before sending

                    socket.emit('system_restart_initiated', {
                        success: true,
                        serialNumber,
                        systemType: systemType || 'device',
                        restart_type: requestData.restart_type || 'soft',
                        estimated_restart_time: new Date(Date.now() + (requestData.delay_ms || 5000)).toISOString(),
                        timestamp: new Date().toISOString()
                    });

                    console.log(`[RESTART] System restart initiated for ${systemType || 'device'} ${serialNumber}`);
                } catch (error) {
                    console.error(`[RESTART] System restart error for ${serialNumber}:`, error);

                    socket.emit('system_restart_error', {
                        success: false,
                        error: error instanceof Error ? error.message : 'Restart failed',
                        serialNumber,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // ✅ CLIENT DISCONNECT HANDLER
            socket.on('disconnect', () => {
                console.log(`[CLIENT] Client disconnected from ${systemType || 'device'} ${serialNumber} (user: ${accountId})`);

                // Notify other clients about disconnection
                socket.broadcast.emit('client_disconnected', {
                    serialNumber,
                    systemType: systemType || 'device',
                    accountId,
                    timestamp: new Date().toISOString()
                });
            });

            // ✅ ERROR HANDLER for client socket
            socket.on('error', (error) => {
                console.error(`[CLIENT] Socket error for ${serialNumber} (user: ${accountId}):`, error);

                socket.emit('socket_error', {
                    error: error.message || 'Socket error occurred',
                    serialNumber,
                    systemType: systemType || 'device',
                    timestamp: new Date().toISOString()
                });
            });

            // ✅ CLIENT PING/PONG for connection health
            socket.on('ping', () => {
                socket.emit('pong', {
                    serialNumber,
                    systemType: systemType || 'device',
                    server_time: new Date().toISOString(),
                    timestamp: new Date().toISOString()
                });
            });
        }
    });

    // ============= SERVER HEALTH MONITORING =============

    // Monitor overall system health
    setInterval(() => {
        const connectedDevices = io.sockets.adapter.rooms;
        const deviceCount = Array.from(connectedDevices.keys()).filter((room: string) => room.startsWith('device:')).length;
        const hubCount = Array.from(connectedDevices.keys()).filter((room: string) => room.startsWith('hub:')).length;
        const gatewayCount = Array.from(connectedDevices.keys()).filter((room: string) => room.startsWith('gateway:')).length;

        console.log(`[MONITOR] System Health - Devices: ${deviceCount}, Hubs: ${hubCount}, Gateways: ${gatewayCount}`);

        // Emit system health to all clients
        io.of('/client').emit('system_health_update', {
            connected_devices: deviceCount,
            connected_hubs: hubCount,
            connected_gateways: gatewayCount,
            total_rooms: connectedDevices.size,
            system_status: 'healthy',
            timestamp: new Date().toISOString()
        });
    }, 30000); // Every 30 seconds

    // ============= GRACEFUL SHUTDOWN HANDLER =============

    process.on('SIGTERM', () => {
        console.log('[SHUTDOWN] Received SIGTERM, gracefully shutting down ESP-01 Hub Socket...');

        // Notify all connected devices about shutdown
        io.emit('server_shutdown', {
            message: 'Server is shutting down gracefully',
            reconnect_expected: true,
            timestamp: new Date().toISOString()
        });

        // Close all connections after 5 seconds
        setTimeout(() => {
            io.close(() => {
                console.log('[SHUTDOWN] ESP-01 Hub Socket closed successfully');
                process.exit(0);
            });
        }, 5000);
    });

    process.on('SIGINT', () => {
        console.log('[SHUTDOWN] Received SIGINT, gracefully shutting down ESP-01 Hub Socket...');

        // Notify all connected devices about shutdown
        io.emit('server_shutdown', {
            message: 'Server is shutting down gracefully',
            reconnect_expected: true,
            timestamp: new Date().toISOString()
        });

        // Close all connections after 3 seconds
        setTimeout(() => {
            io.close(() => {
                console.log('[SHUTDOWN] ESP-01 Hub Socket closed successfully');
                process.exit(0);
            });
        }, 3000);
    });

    // ============= FINAL INITIALIZATION LOG =============

    console.log('[INIT] ✅ ESP-01 Optimized Hub socket setup completed');
    console.log('[INIT] 📡 WebSocket Server Ready');
    console.log('[INIT] 🔧 System Architecture:');
    console.log('[INIT]   ┌─ ESP Socket Hub (Optimized): WebSocket gateway for ESP-01 doors');
    console.log('[INIT]   ├─ ESP Gateway: ESP8266 Master + ESP-01 Slaves via ESP-NOW');
    console.log('[INIT]   ├─ ESP-01 Direct: Individual ESP-01 door controllers');
    console.log('[INIT]   └─ ESP8266 Direct: Individual ESP8266 controllers (legacy)');
    console.log('[INIT] 🚀 Features:');
    console.log('[INIT]   ✅ Compact data transmission');
    console.log('[INIT]   ✅ ESP-01 optimized messaging');
    console.log('[INIT]   ✅ Real-time status monitoring');
    console.log('[INIT]   ✅ Enhanced error handling');
    console.log('[INIT]   ✅ Multi-device gateway support');
    console.log('[INIT]   ✅ System health monitoring');
    console.log('[INIT]   ✅ Graceful shutdown handling');
    console.log('[INIT]   ✅ Firmware management support');
    console.log('[INIT] 🎯 Ready for ESP-01 door control operations!');
};
