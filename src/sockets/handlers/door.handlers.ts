// src/sockets/handlers/door.handlers.ts
import { Socket, Server } from 'socket.io';
import prisma from '../../config/database';

export const setupDoorDeviceHandlers = (socket: Socket, io: Server, serialNumber: string) => {
    const clientNamespace = io.of('/client');

    console.log(`[DOOR] Setting up handlers for ${serialNumber}`);

    // Handle device online - just update basic status
    socket.on('device_online', async (data) => {
        try {
            console.log(`[DOOR] Device online: ${serialNumber}`);

            // Simple acknowledgment
            socket.emit('device_online_ack', {
                status: 'connected',
                serialNumber,
                timestamp: new Date().toISOString()
            });

            // Update database - only basic online status
            await prisma.devices.update({
                where: { serial_number: serialNumber },
                data: {
                    updated_at: new Date(),
                    // Clear runtime_capabilities - keep simple
                    runtime_capabilities: null
                }
            });

            // Notify clients
            clientNamespace.emit('device_connect', {
                serialNumber,
                deviceType: 'ESP01_DOOR',
                status: 'online',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[DOOR] Error in device_online for ${serialNumber}:`, error);
        }
    });

    // Handle command responses and update door state in attribute
    socket.on('command_response', async (data) => {
        try {
            console.log(`[DOOR] Command response from ${serialNumber}:`, data);

            const targetSerial = data.deviceId || data.serialNumber || data.d || serialNumber;

            // Parse response data
            let doorState = 'unknown';
            let servoAngle = 0;
            let lastCommand = 'UNKNOWN';

            if (data.compact_data) {
                // Handle compact response
                const stateMap: { [key: string]: string } = {
                    'CLD': 'closed',
                    'OPD': 'open',
                    'CLG': 'closing',
                    'OPG': 'opening'
                };
                doorState = stateMap[data.s] || 'unknown';
                servoAngle = data.a || 0;
                lastCommand = data.c || 'UNKNOWN';
            } else {
                // Handle regular response
                doorState = data.door_state || 'unknown';
                servoAngle = data.servo_angle || data.angle || 0;
                lastCommand = data.command || data.action || 'UNKNOWN';
            }

            // Update attribute column with door state
            const doorAttribute = {
                door_type: "SERVO",
                door_state: doorState,
                servo_angle: servoAngle,
                last_command: lastCommand,
                power_status: true,
                last_seen: new Date().toISOString(),
                command_timeout: 5000
            };

            await prisma.devices.update({
                where: { serial_number: targetSerial },
                data: {
                    attribute: doorAttribute,
                    updated_at: new Date()
                }
            });

            // Send to clients
            clientNamespace.to(`door:${targetSerial}`).emit('door_command_response', {
                serialNumber: targetSerial,
                door_state: doorState,
                servo_angle: servoAngle,
                last_command: lastCommand,
                success: data.success || data.s === 1,
                timestamp: new Date().toISOString()
            });

            console.log(`[DOOR] Updated door state for ${targetSerial}: ${doorState}`);

        } catch (error) {
            console.error(`[DOOR] Error in command_response for ${serialNumber}:`, error);
        }
    });

    // Handle status updates
    socket.on('deviceStatus', async (data) => {
        try {
            console.log(`[DOOR] Status update from ${serialNumber}:`, data);

            const targetSerial = data.deviceId || data.serialNumber || data.d || serialNumber;

            let doorState = 'unknown';
            let servoAngle = 0;

            if (data.compact_data || data.d) {
                const stateMap: { [key: string]: string } = {
                    'CLD': 'closed',
                    'OPD': 'open',
                    'CLG': 'closing',
                    'OPG': 'opening'
                };
                doorState = stateMap[data.s] || 'unknown';
                servoAngle = data.a || 0;
            } else {
                doorState = data.door_state || 'unknown';
                servoAngle = data.servo_angle || data.angle || 0;
            }

            // Update attribute with current status
            const doorAttribute = {
                door_type: "SERVO",
                door_state: doorState,
                servo_angle: servoAngle,
                last_command: "STATUS",
                power_status: true,
                last_seen: new Date().toISOString(),
                command_timeout: 5000
            };

            await prisma.devices.update({
                where: { serial_number: targetSerial },
                data: {
                    attribute: doorAttribute,
                    updated_at: new Date()
                }
            });

            // Send to clients
            clientNamespace.to(`door:${targetSerial}`).emit('door_status', {
                serialNumber: targetSerial,
                door_state: doorState,
                servo_angle: servoAngle,
                online: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[DOOR] Error in deviceStatus for ${serialNumber}:`, error);
        }
    });

    // Handle config updates
    socket.on('config_response', async (data) => {
        try {
            console.log(`[DOOR] Config from ${serialNumber}:`, data);

            const targetSerial = data.d || data.deviceId || data.serialNumber || serialNumber;

            let configData = {
                door_type: "SERVO",
                servo_closed_angle: 0,
                servo_open_angle: 90,
                last_seen: new Date().toISOString()
            };

            if (data.type === 'servo_angles' || data.action === 'ANG') {
                configData.servo_closed_angle = data.v1 || 0;
                configData.servo_open_angle = data.v2 || 90;
            }

            // Update attribute with config
            await prisma.devices.update({
                where: { serial_number: targetSerial },
                data: {
                    attribute: configData,
                    updated_at: new Date()
                }
            });

            // Send to clients
            clientNamespace.to(`door:${targetSerial}`).emit('door_config', {
                serialNumber: targetSerial,
                ...configData,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[DOOR] Error in config_response for ${serialNumber}:`, error);
        }
    });

    // Handle disconnect - just update offline status
    socket.on('disconnect', async (reason) => {
        console.log(`[DOOR] ${serialNumber} disconnected: ${reason}`);

        try {
            // Update attribute to show offline
            const currentDevice = await prisma.devices.findFirst({
                where: { serial_number: serialNumber }
            });

            if (currentDevice) {
                const currentAttribute = currentDevice.attribute as any || {};
                const offlineAttribute = {
                    ...currentAttribute,
                    power_status: false,
                    last_seen: new Date().toISOString(),
                    offline_reason: reason
                };

                await prisma.devices.update({
                    where: { serial_number: serialNumber },
                    data: {
                        attribute: offlineAttribute,
                        updated_at: new Date()
                    }
                });
            }

            // Notify clients
            clientNamespace.emit('door_disconnect', {
                serialNumber,
                reason: reason,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[DOOR] Error updating offline status for ${serialNumber}:`, error);
        }
    });

    // Simple ping/pong
    socket.on('ping', () => {
        socket.emit('pong', {
            timestamp: new Date().toISOString(),
            serialNumber
        });
    });
};

// Hub handlers for ESP Socket Hub
export const setupDoorHubHandlers = (socket: Socket, io: Server, hubSerial: string) => {
    const clientNamespace = io.of('/client');

    console.log(`[HUB] Setting up handlers for ${hubSerial}`);

    socket.on('device_online', async (data) => {
        try {
            console.log(`[HUB] Hub online: ${hubSerial}`);

            socket.emit('device_online_ack', {
                status: 'connected',
                deviceType: 'ESP_SOCKET_HUB',
                timestamp: new Date().toISOString()
            });

            // Update hub status in database
            await prisma.devices.update({
                where: { serial_number: hubSerial },
                data: {
                    attribute: {
                        device_type: 'ESP_SOCKET_HUB',
                        status: 'online',
                        last_seen: new Date().toISOString(),
                        firmware_version: data.firmware_version || 'unknown'
                    },
                    updated_at: new Date(),
                    runtime_capabilities: null // Keep simple
                }
            });

            clientNamespace.emit('hub_online', {
                serialNumber: hubSerial,
                deviceType: 'ESP_SOCKET_HUB',
                status: 'online',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[HUB] Error in device_online for ${hubSerial}:`, error);
        }
    });

    // Forward door responses to individual door handlers
    socket.on('door_response', (data) => {
        try {
            const targetSerial = data.deviceId || data.serialNumber || data.d;
            if (targetSerial) {
                // Emit as command_response to be handled by door handlers
                socket.emit('command_response', data);
            }
        } catch (error) {
            console.error(`[HUB] Error forwarding door response:`, error);
        }
    });

    socket.on('disconnect', async (reason) => {
        console.log(`[HUB] Hub ${hubSerial} disconnected: ${reason}`);

        try {
            await prisma.devices.update({
                where: { serial_number: hubSerial },
                data: {
                    attribute: {
                        device_type: 'ESP_SOCKET_HUB',
                        status: 'offline',
                        last_seen: new Date().toISOString(),
                        offline_reason: reason
                    },
                    updated_at: new Date()
                }
            });

            clientNamespace.emit('hub_disconnect', {
                serialNumber: hubSerial,
                reason: reason,
                impact: 'All connected doors may be affected',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[HUB] Error updating offline status for ${hubSerial}:`, error);
        }
    });
};

// ESP-01 Event Handlers
export const setupESP01EventHandlers = (socket: Socket, io: Server, serialNumber: string, device: any) => {
    const clientNamespace = io.of('/client');

    console.log(`[ESP01] Setting up handlers for ${serialNumber}`);

    socket.on('device_online', async (data) => {
        try {
            socket.emit('device_online_ack', {
                status: 'received',
                deviceType: 'ESP-01',
                timestamp: new Date().toISOString()
            });

            clientNamespace.emit('device_connect', {
                serialNumber,
                deviceType: 'ESP-01 DOOR CONTROLLER',
                connectionType: 'esp01_direct',
                link_status: device.link_status,
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
                deviceType: 'ESP-01',
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
                deviceType: 'ESP-01',
                connectionType: 'esp01_direct',
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
            deviceType: 'ESP-01',
            reason: reason,
            timestamp: new Date().toISOString(),
        });
    });
};

// Utility functions
function expandCompactResponse(compactData: any): any {
    return {
        success: compactData.s === 1 || compactData.s === "1" || compactData.success === true,
        result: compactData.r || compactData.result || "processed",
        deviceId: compactData.d || compactData.deviceId,
        command: compactData.c || compactData.command,
        servo_angle: compactData.a || compactData.servo_angle || compactData.angle || 0,
        door_type: compactData.dt || "SERVO",
        timestamp: compactData.t || compactData.timestamp || Date.now()
    };
}

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
        online: compactData.o === 1 || compactData.o === "1" || true,
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
        'get_config': 'CFG'
    };

    return {
        action: actionMap[action] || action,
        serialNumber: serialNumber,
        door_type: doorType,
        state: state,
        timestamp: new Date().toISOString()
    };
};