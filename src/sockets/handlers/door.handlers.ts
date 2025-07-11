// src/sockets/handlers/door.handlers.ts - ENHANCED FOR ALL DOOR TYPES
import { Namespace, Socket, Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import prisma from '../../config/database';

export const setupDoorHubHandlers = (socket: Socket, io: Server, hubId: string) => {
    const clientNamespace = io.of('/client');

    console.log(`[ESP-HUB] Setting up handlers for ${hubId}`);

    socket.on('device_online', async (data) => {
        try {
            console.log(`[ESP-HUB] Device online from ${hubId}:`, data);

            socket.emit('device_online_ack', {
                status: 'received',
                deviceType: 'ESP Socket Hub (Optimized)',
                esp01_support: true,
                optimization: 'compact_data',
                timestamp: new Date().toISOString()
            });

            clientNamespace.emit('device_connect', {
                serialNumber: hubId,
                deviceType: 'ESP SOCKET HUB (OPTIMIZED)',
                connectionType: 'hub_optimized',
                hub_managed: true,
                esp01_optimized: true,
                capabilities: ['compact_forwarding', 'esp01_bridge', 'optimized_gateway'],
                firmware_version: data.firmware_version,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP-HUB] Error in device_online for ${hubId}:`, error);
        }
    });

    // Enhanced command response handler for all door types
    socket.on('command_response', (data) => {
        try {
            console.log(`[ESP-HUB] Response from ${hubId}:`, data);

            if (data.deviceId || data.serialNumber || data.d) {
                const targetSerial = data.deviceId || data.serialNumber || data.d;
                let responseData = data;

                if (data.esp01_processed || data.compact_data || data.optimized || data.s !== undefined) {
                    responseData = expandCompactResponse(data);
                }

                clientNamespace.to(`door:${targetSerial}`).emit('door_command_response', {
                    serialNumber: targetSerial,
                    ...responseData,
                    deviceType: 'ESP Socket Hub (Optimized)',
                    hub_processed: true,
                    esp01_processed: true,
                    optimized: true,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`[ESP-HUB] Error in command_response for ${hubId}:`, error);
        }
    });

    // Enhanced status handler for all door types
    socket.on('deviceStatus', (data) => {
        try {
            console.log(`[ESP-HUB] Status from ${hubId}:`, data);

            if (data.deviceId || data.serialNumber || data.d) {
                const targetSerial = data.deviceId || data.serialNumber || data.d;
                let statusData = data;

                if (data.compact_data || data.d) {
                    statusData = expandCompactStatus(data);
                }

                clientNamespace.to(`door:${targetSerial}`).emit('door_status', {
                    ...statusData,
                    deviceType: 'ESP Socket Hub (Optimized)',
                    connectionType: 'hub_optimized',
                    esp01_online: true,
                    optimized: true,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`[ESP-HUB] Error in deviceStatus for ${hubId}:`, error);
        }
    });

    // NEW: Enhanced config handler for all door types
    socket.on('config_response', (data) => {
        try {
            console.log(`[ESP-HUB] Config from ${hubId}:`, data);

            const targetSerial = data.d || data.deviceId || data.serialNumber;
            if (!targetSerial) return;

            let configData;
            if (data.type === 'servo_angles') {
                configData = {
                    door_type: 'SERVO',
                    config: {
                        servo_closed_angle: data.v1,
                        servo_open_angle: data.v2
                    }
                };
            } else if (data.type === 'rolling_rounds') {
                configData = {
                    door_type: 'ROLLING',
                    config: {
                        closed_rounds: data.v1,
                        open_rounds: data.v2
                    }
                };
            } else if (data.type === 'sliding_config') {
                configData = {
                    door_type: 'SLIDING',
                    config: {
                        closed_rounds: data.closed_rounds,
                        open_rounds: data.open_rounds,
                        pir_enabled: data.pir_enabled
                    }
                };
            }

            if (configData) {
                clientNamespace.to(`door:${targetSerial}`).emit('door_config', {
                    serialNumber: targetSerial,
                    ...configData,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`[ESP-HUB] Error in config_response for ${hubId}:`, error);
        }
    });

    // Enhanced command forwarding for all door types
    socket.on('command', (commandData) => {
        try {
            console.log(`[ESP-HUB] Command received:`, commandData);

            const targetSerial = commandData.serialNumber;
            if (!targetSerial) return;

            // Create enhanced command based on door type
            const enhancedCommand = createEnhancedCommand(commandData.action, targetSerial, commandData.state, commandData.door_type);
            console.log(`[ESP-HUB] Forwarding: CMD:${targetSerial}:${commandData.action}`);

        } catch (error) {
            console.error(`[ESP-HUB] Error in command forwarding for ${hubId}:`, error);
        }
    });

    socket.on('ping', () => {
        socket.emit('pong', {
            timestamp: new Date().toISOString(),
            hub_serial: hubId,
            optimized: true
        });
    });

    socket.on('disconnect', async (reason) => {
        console.log(`[ESP-HUB] Hub ${hubId} disconnected: ${reason}`);
        clientNamespace.emit('device_disconnect', {
            serialNumber: hubId,
            deviceType: 'ESP Socket Hub (Optimized)',
            reason: reason,
            impact: 'Door gateway lost - All doors affected',
            system_type: 'esp01_optimized',
            timestamp: new Date().toISOString()
        });
    });
};

export const setupESP01EventHandlers = (socket: Socket, io: Server, serialNumber: string, device: any) => {
    const clientNamespace = io.of('/client');

    console.log(`[ESP01] Setting up handlers for ${serialNumber}`);

    socket.on('device_online', async (data) => {
        try {
            socket.emit('device_online_ack', {
                status: 'received',
                deviceType: 'ESP-01 Optimized',
                esp01_mode: true,
                optimized: true,
                timestamp: new Date().toISOString()
            });

            clientNamespace.emit('device_connect', {
                serialNumber,
                deviceType: 'ESP-01 DOOR CONTROLLER (OPTIMIZED)',
                connectionType: 'esp01_optimized',
                link_status: device.link_status,
                esp01_mode: true,
                optimized: true,
                capabilities: ['compact_communication', 'optimized_control'],
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP01] Error in device_online for ${serialNumber}:`, error);
        }
    });

    socket.on('command_response', (data) => {
        try {
            let responseData = data;
            if (data.compact_data || data.s !== undefined) {
                responseData = expandCompactResponse(data);
            }

            clientNamespace.to(`door:${serialNumber}`).emit('door_command_response', {
                serialNumber,
                ...responseData,
                deviceType: 'ESP-01 Optimized',
                esp01_processed: true,
                optimized: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP01] Error in command_response for ${serialNumber}:`, error);
        }
    });

    socket.on('deviceStatus', (data) => {
        try {
            let statusData = data;
            if (data.compact_data || data.d) {
                statusData = expandCompactStatus(data);
            }

            clientNamespace.to(`door:${serialNumber}`).emit('door_status', {
                ...statusData,
                deviceType: 'ESP-01 Optimized',
                connectionType: 'esp01_optimized',
                esp01_mode: true,
                optimized: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP01] Error in deviceStatus for ${serialNumber}:`, error);
        }
    });

    socket.on('disconnect', async (reason) => {
        console.log(`[ESP01] ${serialNumber} disconnected: ${reason}`);

        clientNamespace.emit('door_disconnect', {
            serialNumber,
            deviceType: 'ESP-01 Optimized',
            esp01_mode: true,
            optimized: true,
            reason: reason,
            timestamp: new Date().toISOString(),
        });
    });
};

export const setupDoorDeviceHandlers = (socket: Socket, io: Server, serialNumber: string, device: any) => {
    const clientNamespace = io.of('/client');

    socket.on('device_online', async (data) => {
        try {
            socket.emit('device_online_ack', {
                status: 'received',
                deviceType: 'ESP8266 Direct',
                optimized: true,
                timestamp: new Date().toISOString()
            });

            clientNamespace.emit('device_connect', {
                serialNumber,
                deviceType: data.deviceType || 'SERVO_DOOR_CONTROLLER',
                connectionType: 'direct',
                link_status: device.link_status,
                optimized: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP8266] Error in device_online for ${serialNumber}:`, error);
        }
    });

    socket.on('disconnect', async (reason) => {
        clientNamespace.emit('door_disconnect', {
            serialNumber,
            deviceType: 'ESP8266 Direct',
            optimized: true,
            reason: reason,
            timestamp: new Date().toISOString()
        });
    });
};

// Enhanced response expansion for all door types
function expandCompactResponse(compactData: any): any {
    return {
        success: compactData.s === 1 || compactData.s === "1" || compactData.success === true,
        result: compactData.r || compactData.result || "processed",
        deviceId: compactData.d || compactData.deviceId,
        command: compactData.c || compactData.command,
        servo_angle: compactData.a || compactData.servo_angle || compactData.angle || 0,
        door_type: compactData.dt || "SERVO",
        esp01_processed: true,
        optimized: true,
        compact_expanded: true,
        timestamp: compactData.t || compactData.timestamp || Date.now()
    };
}

// Enhanced status expansion for all door types
function expandCompactStatus(compactData: any): any {
    const stateMap: { [key: string]: string } = {
        'CLD': 'closed',
        'OPG': 'opening',
        'OPD': 'open',
        'CLG': 'closing'
    };

    return {
        deviceId: compactData.d || compactData.deviceId,
        door_state: stateMap[compactData.s] || compactData.s || compactData.door_state || 'unknown',
        servo_angle: compactData.a || compactData.servo_angle || compactData.angle || 0,
        door_type: compactData.dt || "SERVO",
        esp01_online: compactData.o === 1 || compactData.o === "1" || true,
        optimized: true,
        compact_expanded: true,
        timestamp: compactData.t || compactData.timestamp || Date.now()
    };
}

// Enhanced command creation for all door types
export const createEnhancedCommand = (action: string, serialNumber: string, state: any = {}, doorType: string = "SERVO"): any => {
    const actionMap: { [key: string]: string } = {
        'open_door': 'OPN',
        'close_door': 'CLS',
        'toggle_door': 'TGL',
        'configure_door': 'CFG',
        'toggle_pir': 'PIR'
    };

    return {
        action: actionMap[action] || action,
        serialNumber: serialNumber,
        door_type: doorType,
        compact_data: true,
        esp01_optimized: true,
        state: state,
        timestamp: new Date().toISOString()
    };
};

export const validateESP01Data = (data: any): boolean => {
    if (data.compact_data) {
        return data.d && (data.s !== undefined) && data.t;
    }
    return data.serialNumber || data.deviceId;
};