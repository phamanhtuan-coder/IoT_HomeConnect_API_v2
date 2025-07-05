// src/sockets/handlers/door.handlers.ts - ESP-01 OPTIMIZED SYSTEM ONLY
import { Namespace, Socket, Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import prisma from '../../config/database';

/**
 * ✅ OPTIMIZED: Setup ESP Socket Hub handlers for ESP-01 system
 * Handles optimized data transmission and compact commands
 */
export const setupDoorHubHandlers = (socket: Socket, io: Server, hubId: string) => {
    const clientNamespace = io.of('/client');

    console.log(`[ESP-HUB] Setting up Optimized ESP Socket Hub for ${hubId}`);

    // ESP Socket Hub sends device_online
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

    // ✅ OPTIMIZED: Handle compact command responses from ESP Master/Gateway
    socket.on('command_response', (data) => {
        try {
            console.log(`[ESP-HUB] Compact response from ${hubId}:`, data);

            if (data.deviceId || data.serialNumber || data.d) {
                const targetSerial = data.deviceId || data.serialNumber || data.d;

                // Handle both compact and full responses
                let responseData = data;

                // If compact response, expand it
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

                console.log(`[ESP-HUB] Optimized response forwarded to ${targetSerial}`);
            }
        } catch (error) {
            console.error(`[ESP-HUB] Error in command_response for ${hubId}:`, error);
        }
    });

    // ✅ OPTIMIZED: Handle compact device status
    socket.on('deviceStatus', (data) => {
        try {
            console.log(`[ESP-HUB] Compact status from ${hubId}:`, data);

            if (data.deviceId || data.serialNumber || data.d) {
                const targetSerial = data.deviceId || data.serialNumber || data.d;

                // Expand compact status if needed
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

    // Handle commands from clients - forward to ESP devices
    socket.on('command', (commandData) => {
        try {
            console.log(`[ESP-HUB] Command received for forwarding:`, commandData);

            // Extract target serial
            const targetSerial = commandData.serialNumber;
            if (!targetSerial) {
                console.log(`[ESP-HUB] No target serial in command`);
                return;
            }

            // Create compact command for ESP system
            const compactCommand = createCompactCommand(commandData.action, targetSerial, commandData.state);

            // Send compact command to serial (MEGA will parse this)
            console.log(`[ESP-HUB] Sending compact command: CMD:${targetSerial}:${commandData.action}`);

        } catch (error) {
            console.error(`[ESP-HUB] Error in command forwarding for ${hubId}:`, error);
        }
    });

    // Standard ping/pong for stability
    socket.on('ping', () => {
        try {
            socket.emit('pong', {
                timestamp: new Date().toISOString(),
                hub_serial: hubId,
                optimized: true
            });
        } catch (error) {
            console.error(`[ESP-HUB] Error in ping for ${hubId}:`, error);
        }
    });

    socket.on('pong', (data) => {
        try {
            console.log(`[ESP-HUB] Pong from ${hubId}`);
        } catch (error) {
            console.error(`[ESP-HUB] Error in pong for ${hubId}:`, error);
        }
    });

    socket.on('disconnect', async (reason) => {
        console.log(`[ESP-HUB] Optimized ESP Socket Hub ${hubId} disconnected. Reason: ${reason}`);

        try {
            clientNamespace.emit('device_disconnect', {
                serialNumber: hubId,
                deviceType: 'ESP Socket Hub (Optimized)',
                reason: reason,
                impact: 'Optimized door gateway lost - All ESP-01 doors affected',
                affected_doors: 'All 7 ESP-01 doors',
                system_type: 'esp01_optimized',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP-HUB] Error in disconnect for ${hubId}:`, error);
        }
    });
};

/**
 * ✅ OPTIMIZED: Setup ESP-01 door device handlers with compact data support
 */
export const setupESP01EventHandlers = (socket: Socket, io: Server, serialNumber: string, device: any) => {
    const clientNamespace = io.of('/client');

    console.log(`[ESP01] Setting up Optimized ESP-01 handlers for ${serialNumber}`);

    socket.on('device_online', async (data) => {
        try {
            console.log(`[ESP01] Device online from ${serialNumber}:`, data);

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

    // ✅ OPTIMIZED: Handle compact command responses
    socket.on('command_response', (data) => {
        try {
            console.log(`[ESP01] Compact response from ${serialNumber}:`, data);

            // Expand compact data if needed
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

    // ✅ OPTIMIZED: Handle compact device status
    socket.on('deviceStatus', (data) => {
        try {
            console.log(`[ESP01] Compact status from ${serialNumber}:`, data);

            // Expand compact status if needed
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

    // Heartbeat handling
    socket.on('heartbeat', (data) => {
        try {
            console.log(`[ESP01] Heartbeat from ${serialNumber}`);

            socket.emit('heartbeat_ack', {
                received: true,
                deviceType: 'ESP-01 Optimized',
                esp01_mode: true,
                optimized: true,
                server_time: new Date().toISOString(),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP01] Error in heartbeat for ${serialNumber}:`, error);
        }
    });

    socket.on('disconnect', async (reason) => {
        console.log(`[ESP01] ESP-01 ${serialNumber} disconnected. Reason: ${reason}`);

        try {
            await prisma.devices.update({
                where: { serial_number: serialNumber },
                data: {
                    updated_at: new Date(),
                    runtime_capabilities: {
                        ...device.runtime_capabilities as any,
                        last_socket_disconnection: new Date().toISOString(),
                        socket_connected: false,
                        esp01_last_disconnect: reason,
                        esp01_mode: true,
                        optimized: true
                    }
                }
            }).catch(err => {
                console.error(`[ESP01] Database update failed:`, err);
            });

            clientNamespace.emit('door_disconnect', {
                serialNumber,
                deviceType: 'ESP-01 Optimized',
                esp01_mode: true,
                optimized: true,
                reason: reason,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error(`[ESP01] Error in disconnect handler for ${serialNumber}:`, error);
        }
    });
};

/**
 * Setup standard door device handlers (ESP8266) - keeping for compatibility
 */
export const setupDoorDeviceHandlers = (socket: Socket, io: Server, serialNumber: string, device: any) => {
    const clientNamespace = io.of('/client');

    console.log(`[ESP8266] Setting up ESP8266 door device handlers for ${serialNumber}`);

    socket.on('device_online', async (data) => {
        try {
            console.log(`[ESP8266] Device online from ${serialNumber}:`, data);

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

    socket.on('command_response', (data) => {
        try {
            console.log(`[ESP8266] Command response from ${serialNumber}:`, data);

            clientNamespace.to(`door:${serialNumber}`).emit('door_command_response', {
                serialNumber,
                ...data,
                deviceType: 'ESP8266 Direct',
                optimized: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP8266] Error in command_response for ${serialNumber}:`, error);
        }
    });

    socket.on('deviceStatus', (data) => {
        try {
            console.log(`[ESP8266] Device status from ${serialNumber}:`, data);

            clientNamespace.to(`door:${serialNumber}`).emit('door_status', {
                ...data,
                deviceType: 'ESP8266 Direct',
                connectionType: 'direct',
                optimized: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP8266] Error in deviceStatus for ${serialNumber}:`, error);
        }
    });

    socket.on('disconnect', async (reason) => {
        console.log(`[ESP8266] Device ${serialNumber} disconnected. Reason: ${reason}`);

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
                        optimized: true,
                        last_seen: new Date().toISOString()
                    }
                }
            }).catch(err => {
                console.error(`[ESP8266] Database update failed:`, err);
            });

            clientNamespace.emit('door_disconnect', {
                serialNumber,
                deviceType: 'ESP8266 Direct',
                optimized: true,
                reason: reason,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP8266] Error handling disconnect for ${serialNumber}:`, error);
        }
    });
};

/**
 * ✅ OPTIMIZED: Expand compact response format
 */
function expandCompactResponse(compactData: any): any {
    const expanded = {
        success: compactData.s === 1 || compactData.s === "1" || compactData.success === true || compactData.success === "true",
        result: compactData.r || compactData.result || "processed",
        deviceId: compactData.d || compactData.deviceId,
        command: compactData.c || compactData.command,
        servo_angle: compactData.a || compactData.servo_angle || compactData.angle || 0,
        esp01_processed: true,
        optimized: true,
        compact_expanded: true,
        timestamp: compactData.t || compactData.timestamp || Date.now()
    };

    console.log(`[EXPAND] Compact → Full:`, { compactData, expanded });
    return expanded;
}

/**
 * ✅ OPTIMIZED: Expand compact status format
 */
function expandCompactStatus(compactData: any): any {
    // Map compact state codes to full names
    const stateMap: { [key: string]: string } = {
        'CLD': 'closed',
        'OPG': 'opening',
        'OPD': 'open',
        'CLG': 'closing'
    };

    const expanded = {
        deviceId: compactData.d || compactData.deviceId,
        door_state: stateMap[compactData.s] || compactData.s || compactData.door_state || 'unknown',
        servo_angle: compactData.a || compactData.servo_angle || compactData.angle || 0,
        esp01_online: compactData.o === 1 || compactData.o === "1" || true,
        optimized: true,
        compact_expanded: true,
        timestamp: compactData.t || compactData.timestamp || Date.now()
    };

    console.log(`[EXPAND-STS] Compact Status → Full:`, { compactData, expanded });
    return expanded;
}

/**
 * ✅ OPTIMIZED: Helper function to create compact commands for ESP-01
 */
export const createCompactCommand = (action: string, serialNumber: string, state: any = {}): any => {
    // Map full actions to compact format
    const actionMap: { [key: string]: string } = {
        'open_door': 'OPN',
        'close_door': 'CLS',
        'toggle_door': 'TGL'
    };

    const compactAction = actionMap[action] || action;

    return {
        action: compactAction,
        serialNumber: serialNumber,
        compact_data: true,
        esp01_optimized: true,
        state: state,
        timestamp: new Date().toISOString()
    };
};

/**
 * ✅ OPTIMIZED: Validate ESP-01 data integrity
 */
export const validateESP01Data = (data: any): boolean => {
    // Check for required fields in compact format
    if (data.compact_data) {
        return data.d && (data.s !== undefined) && data.t;
    }

    // Check for standard format
    return data.serialNumber || data.deviceId;
};