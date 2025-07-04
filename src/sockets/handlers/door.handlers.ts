// src/sockets/handlers/door.handlers.ts - UPDATED WITH ARDUINO UNO SYSTEM
import { Namespace, Socket, Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import prisma from '../../config/database';

/**
 * Setup Arduino Mega Hub handlers for Door + Central Hub system
 */
export const setupArduinoMegaHandlers = (socket: Socket, io: Server, hubId: string) => {
    const clientNamespace = io.of('/client');

    console.log(`[MEGA-HUB] Setting up Arduino Mega Central Hub handlers for ${hubId}`);

    // Central hub status
    socket.on('hub_status', async (data) => {
        try {
            console.log(`[MEGA-HUB] Hub status from ${hubId}:`, data);

            clientNamespace.emit('hub_status', {
                serialNumber: hubId,
                deviceType: 'Arduino Mega Hub',
                systemType: 'central_hub',
                ...data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[MEGA-HUB] Error in hub_status for ${hubId}:`, error);
        }
    });

    // Door command responses (existing logic)
    socket.on('command_response', (data) => {
        try {
            console.log(`[MEGA-HUB] Command response from ${hubId}:`, data);

            if (data.deviceId || data.serialNumber) {
                const targetSerial = data.deviceId || data.serialNumber;
                clientNamespace.to(`door:${targetSerial}`).emit('door_command_response', {
                    serialNumber: targetSerial,
                    ...data,
                    deviceType: 'Arduino Mega Hub',
                    hub_processed: true,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`[MEGA-HUB] Error in command_response for ${hubId}:`, error);
        }
    });

    // Door device status updates
    socket.on('deviceStatus', (data) => {
        try {
            console.log(`[MEGA-HUB] Device status from ${hubId}:`, data);

            if (data.deviceId || data.serialNumber) {
                const targetSerial = data.deviceId || data.serialNumber;
                clientNamespace.to(`door:${targetSerial}`).emit('door_status', {
                    ...data,
                    deviceType: 'Arduino Mega Hub',
                    connectionType: 'mega_hub',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`[MEGA-HUB] Error in deviceStatus for ${hubId}:`, error);
        }
    });

    // Door system health monitoring
    socket.on('door_system_health', (data) => {
        try {
            console.log(`[MEGA-HUB] Door system health from ${hubId}:`, data);

            clientNamespace.emit('door_system_health', {
                hubId,
                ...data,
                systemType: 'door',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[MEGA-HUB] Error in door_system_health for ${hubId}:`, error);
        }
    });

    // Handle door commands from clients
    socket.on('door_command', (data) => {
        try {
            console.log(`[MEGA-HUB] Door command received at hub ${hubId}:`, data);

            // Process door command (forward to appropriate ESP-01/ESP8266)
            socket.emit('door_command_ack', {
                status: 'received',
                command: data.action,
                targetDevice: data.deviceId || data.serialNumber,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[MEGA-HUB] Error in door_command for ${hubId}:`, error);
        }
    });

    // Heartbeat from Arduino Mega
    socket.on('heartbeat', (data) => {
        try {
            console.log(`[MEGA-HUB] Heartbeat from ${hubId}:`, data);

            socket.emit('heartbeat_ack', {
                received: true,
                deviceType: 'Arduino Mega Hub',
                server_time: new Date().toISOString(),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[MEGA-HUB] Error in heartbeat for ${hubId}:`, error);
        }
    });

    // Standard disconnect handler
    socket.on('disconnect', async (reason) => {
        console.log(`[MEGA-HUB] Arduino Mega Hub ${hubId} disconnected. Reason: ${reason}`);

        try {
            clientNamespace.emit('hub_disconnect', {
                serialNumber: hubId,
                deviceType: 'Arduino Mega Hub',
                systemType: 'central_hub',
                reason: reason,
                impact: 'Central hub functionality lost - Garden and Door systems affected',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[MEGA-HUB] Error in disconnect for ${hubId}:`, error);
        }
    });
};

/**
 * Setup Door Hub handlers (ESP Socket Hub) - EXACT MATCH với ESP code hiện tại
 */
export const setupDoorHubHandlers = (socket: Socket, io: Server, hubId: string) => {
    const clientNamespace = io.of('/client');

    console.log(`[DOOR-HUB] Setting up ESP Socket Hub handlers for ${hubId}`);

    // ESP Socket Hub sends device_online exactly như trong ESP code
    socket.on('device_online', async (data) => {
        try {
            console.log(`[DOOR-HUB] ESP Socket Hub device_online from ${hubId}:`, data);

            // Exact response format ESP expects
            socket.emit('device_online_ack', {
                status: 'received',
                deviceType: 'ESP Door Hub',
                esp01_support: true,
                timestamp: new Date().toISOString()
            });

            // Notify clients về ESP Socket Hub connection
            clientNamespace.emit('device_connect', {
                serialNumber: hubId,
                deviceType: 'ESP DOOR HUB CONTROLLER',
                connectionType: 'hub',
                hub_managed: true,
                discovery_mode: data.discovery_mode || 'dynamic',
                capabilities: ['command_forwarding', 'esp01_bridge', 'gateway_management'],
                firmware_version: data.firmware_version,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[DOOR-HUB] Error in device_online for ${hubId}:`, error);
        }
    });

    // ESP Socket Hub forwards command responses từ ESP Gateway Master
    socket.on('command_response', (data) => {
        try {
            console.log(`[DOOR-HUB] Command response from ESP Socket Hub ${hubId}:`, data);

            // Data comes from ESP Gateway Master via Serial, forwarded by ESP Socket Hub
            if (data.deviceId || data.serialNumber) {
                const targetSerial = data.deviceId || data.serialNumber;

                // Forward exact response to specific door client
                clientNamespace.to(`door:${targetSerial}`).emit('door_command_response', {
                    serialNumber: targetSerial,
                    ...data,
                    deviceType: 'ESP Door Hub',
                    hub_processed: true,
                    gateway_processed: data.gateway_processed || false,
                    esp01_processed: data.esp01_processed || false,
                    timestamp: new Date().toISOString()
                });

                console.log(`[DOOR-HUB] Response forwarded to door client ${targetSerial}`);
            }
        } catch (error) {
            console.error(`[DOOR-HUB] Error in command_response for ${hubId}:`, error);
        }
    });

    // ESP Socket Hub forwards device status từ ESP-01 via Gateway
    socket.on('deviceStatus', (data) => {
        try {
            console.log(`[DOOR-HUB] Device status from ESP Socket Hub ${hubId}:`, data);

            if (data.deviceId || data.serialNumber) {
                const targetSerial = data.deviceId || data.serialNumber;

                // Forward status to specific door client
                clientNamespace.to(`door:${targetSerial}`).emit('door_status', {
                    ...data,
                    deviceType: 'ESP Door Hub',
                    connectionType: 'hub',
                    esp01_online: data.esp01_online || false,
                    servo_angle: data.servo_angle,
                    door_state: data.door_state,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`[DOOR-HUB] Error in deviceStatus for ${hubId}:`, error);
        }
    });

    // ESP Socket Hub sends welcome_ack (existing trong ESP code)
    socket.on('welcome_ack', (data) => {
        try {
            console.log(`[DOOR-HUB] Welcome ack from ESP Socket Hub ${hubId}:`, data);
            // ESP Socket Hub confirmed connection
        } catch (error) {
            console.error(`[DOOR-HUB] Error in welcome_ack for ${hubId}:`, error);
        }
    });

    // Handle ping/pong cho ESP Socket Hub stability
    socket.on('ping', () => {
        try {
            console.log(`[DOOR-HUB] Ping from ESP Socket Hub ${hubId}`);
            socket.emit('pong', {
                timestamp: new Date().toISOString(),
                hub_serial: hubId
            });
        } catch (error) {
            console.error(`[DOOR-HUB] Error in ping for ${hubId}:`, error);
        }
    });

    socket.on('pong', (data) => {
        try {
            console.log(`[DOOR-HUB] Pong from ESP Socket Hub ${hubId}:`, data);
            // Connection health confirmed
        } catch (error) {
            console.error(`[DOOR-HUB] Error in pong for ${hubId}:`, error);
        }
    });

    socket.on('disconnect', async (reason) => {
        console.log(`[DOOR-HUB] ESP Socket Hub ${hubId} disconnected. Reason: ${reason}`);

        try {
            // Notify all clients về gateway loss
            clientNamespace.emit('device_disconnect', {
                serialNumber: hubId,
                deviceType: 'ESP Socket Hub',
                reason: reason,
                impact: 'Door gateway functionality lost - All door controls affected',
                affected_doors: 'All managed ESP-01 doors',
                timestamp: new Date().toISOString()
            });

            console.log(`[DOOR-HUB] Cleanup completed for ESP Socket Hub ${hubId}`);
        } catch (error) {
            console.error(`[DOOR-HUB] Error in disconnect for ${hubId}:`, error);
        }
    });
};

/**
 * ✅ NEW: Setup Arduino Uno Door System handlers
 * This replaces the ESP-01 + ESP Master Gateway system
 */
export const setupArduinoUnoDoorHandlers = (socket: Socket, io: Server, serialNumber: string, device: any) => {
    const clientNamespace = io.of('/client');

    console.log(`[UNO-DOOR] Setting up Arduino Uno door system handlers for ${serialNumber}`);

    // Device online event from ESP Master Board
    socket.on('device_online', async (data) => {
        try {
            console.log(`[UNO-DOOR] ESP Master Board online from ${serialNumber}:`, data);

            socket.emit('device_online_ack', {
                status: 'received',
                deviceType: 'ESP Master Board (Uno System)',
                uno_system: true,
                servo_count: 6,
                timestamp: new Date().toISOString()
            });

            clientNamespace.emit('device_connect', {
                serialNumber,
                deviceType: 'ESP MASTER BOARD (UNO SYSTEM)',
                connectionType: 'uno_serial',
                link_status: device.link_status,
                uno_system: true,
                servo_count: 6,
                capabilities: ['door_control', 'status_reporting', 'uno_bridge'],
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[UNO-DOOR] Error in device_online for ${serialNumber}:`, error);
        }
    });

    // Command response from Arduino Uno (via ESP Master)
    socket.on('command_response', (data) => {
        try {
            console.log(`[UNO-DOOR] Command response from ${serialNumber}:`, data);

            // Check if response is from Arduino Uno system
            if (data.uno_processed || data.connection_type === 'uno_serial') {
                clientNamespace.to(`door:${serialNumber}`).emit('door_command_response', {
                    serialNumber,
                    ...data,
                    deviceType: 'Arduino Uno Door System',
                    uno_processed: true,
                    esp_master_processed: true,
                    timestamp: new Date().toISOString()
                });

                console.log(`[UNO-DOOR] Uno system response forwarded for ${serialNumber}`);
            }
        } catch (error) {
            console.error(`[UNO-DOOR] Error in command_response for ${serialNumber}:`, error);
        }
    });

    // Device status from Arduino Uno system
    socket.on('deviceStatus', (data) => {
        try {
            console.log(`[UNO-DOOR] Device status from ${serialNumber}:`, data);

            clientNamespace.to(`door:${serialNumber}`).emit('door_status', {
                ...data,
                deviceType: 'Arduino Uno Door System',
                connectionType: 'uno_serial',
                servo_count: 6,
                uno_system: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[UNO-DOOR] Error in deviceStatus for ${serialNumber}:`, error);
        }
    });

    // Arduino Uno system health monitoring
    socket.on('uno_system_health', (data) => {
        try {
            console.log(`[UNO-DOOR] Uno system health from ${serialNumber}:`, data);

            clientNamespace.emit('uno_system_health', {
                serialNumber,
                ...data,
                systemType: 'door',
                deviceType: 'Arduino Uno Door System',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[UNO-DOOR] Error in uno_system_health for ${serialNumber}:`, error);
        }
    });

    // ESP Master status (bridge between MEGA and Arduino Uno)
    socket.on('esp_master_status', (data) => {
        try {
            console.log(`[UNO-DOOR] ESP Master status from ${serialNumber}:`, data);

            clientNamespace.to(`door:${serialNumber}`).emit('esp_master_status', {
                serialNumber,
                ...data,
                deviceType: 'ESP Master Board',
                bridge_status: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[UNO-DOOR] Error in esp_master_status for ${serialNumber}:`, error);
        }
    });

    // Arduino Uno connection status
    socket.on('uno_connection_status', (data) => {
        try {
            console.log(`[UNO-DOOR] Uno connection status from ${serialNumber}:`, data);

            clientNamespace.to(`door:${serialNumber}`).emit('uno_connection_status', {
                serialNumber,
                ...data,
                deviceType: 'Arduino Uno R3',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[UNO-DOOR] Error in uno_connection_status for ${serialNumber}:`, error);
        }
    });

    // Handle door commands from clients (updated for Uno system)
    socket.on('door_command', (data) => {
        try {
            console.log(`[UNO-DOOR] Door command received at ESP Master ${serialNumber}:`, data);

            // Process door command (forward to Arduino Uno)
            socket.emit('door_command_ack', {
                status: 'received',
                command: data.action,
                targetDevice: data.deviceId || data.serialNumber,
                system: 'arduino_uno',
                servo_count: 6,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[UNO-DOOR] Error in door_command for ${serialNumber}:`, error);
        }
    });

    // Heartbeat from ESP Master Board
    socket.on('heartbeat', (data) => {
        try {
            console.log(`[UNO-DOOR] Heartbeat from ESP Master ${serialNumber}:`, data);

            socket.emit('heartbeat_ack', {
                received: true,
                deviceType: 'ESP Master Board (Uno System)',
                uno_system: true,
                server_time: new Date().toISOString(),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[UNO-DOOR] Error in heartbeat for ${serialNumber}:`, error);
        }
    });

    // Disconnect handler
    socket.on('disconnect', async (reason) => {
        console.log(`[UNO-DOOR] ESP Master Board ${serialNumber} disconnected. Reason: ${reason}`);

        try {
            await prisma.devices.update({
                where: { serial_number: serialNumber },
                data: {
                    updated_at: new Date(),
                    runtime_capabilities: {
                        ...device.runtime_capabilities as any,
                        last_socket_disconnection: new Date().toISOString(),
                        socket_connected: false,
                        disconnection_reason: reason,
                        device_type: 'ESP Master Board (Uno System)',
                        uno_system: true,
                        last_seen: new Date().toISOString(),
                        connection_duration: device.runtime_capabilities?.last_socket_connection ?
                            new Date().getTime() - new Date(device.runtime_capabilities.last_socket_connection).getTime() : 0
                    }
                }
            }).catch(err => {
                console.error(`[UNO-DOOR] Database update failed on disconnect:`, err);
            });

            clientNamespace.emit('device_disconnect', {
                serialNumber,
                deviceType: 'ESP Master Board (Uno System)',
                reason: reason,
                impact: 'Arduino Uno door system lost - All 6 servo doors affected',
                affected_doors: 'All 6 servo doors managed by Arduino Uno',
                system_type: 'arduino_uno',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[UNO-DOOR] Error in disconnect handler for ${serialNumber}:`, error);
        }
    });
};

/**
 * Setup ESP-01 door device handlers
 */
export const setupESP01EventHandlers = (socket: Socket, io: Server, serialNumber: string, device: any) => {
    const clientNamespace = io.of('/client');

    console.log(`[ESP-01] Setting up ESP-01 specific handlers for ${serialNumber}`);

    socket.on('device_online', async (data) => {
        try {
            console.log(`[ESP-01] Device online from ${serialNumber}:`, data);

            socket.emit('device_online_ack', {
                status: 'received',
                deviceType: 'ESP-01 Direct',
                esp01_mode: true,
                timestamp: new Date().toISOString()
            });

            clientNamespace.emit('device_connect', {
                serialNumber,
                deviceType: 'ESP-01 DOOR CONTROLLER',
                connectionType: 'esp01_direct',
                link_status: device.link_status,
                esp01_mode: true,
                capabilities: ['door_control', 'status_reporting'],
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[ESP-01] Error in device_online for ${serialNumber}:`, error);
        }
    });

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

    socket.on('disconnect', async (reason) => {
        console.log(`[ESP-01] Device ${serialNumber} disconnected. Reason: ${reason}`);

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
};

/**
 * Setup standard door device handlers (ESP8266)
 */
export const setupDoorDeviceHandlers = (socket: Socket, io: Server, serialNumber: string, device: any) => {
    const clientNamespace = io.of('/client');

    console.log(`[DOOR-DEVICE] Setting up ESP8266 door device handlers for ${serialNumber}`);

    socket.on('device_online', async (data) => {
        try {
            console.log(`[DOOR-DEVICE] Device online from ${serialNumber}:`, data);

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
        } catch (error) {
            console.error(`[DOOR-DEVICE] Error in device_online for ${serialNumber}:`, error);
        }
    });

    socket.on('command_response', (data) => {
        try {
            console.log(`[DOOR-DEVICE] Command response from ${serialNumber}:`, data);

            clientNamespace.to(`door:${serialNumber}`).emit('door_command_response', {
                serialNumber,
                ...data,
                deviceType: 'ESP8266 Direct',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[DOOR-DEVICE] Error in command_response for ${serialNumber}:`, error);
        }
    });

    socket.on('deviceStatus', (data) => {
        try {
            console.log(`[DOOR-DEVICE] Device status from ${serialNumber}:`, data);

            clientNamespace.to(`door:${serialNumber}`).emit('door_status', {
                ...data,
                deviceType: 'ESP8266 Direct',
                connectionType: 'direct',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[DOOR-DEVICE] Error in deviceStatus for ${serialNumber}:`, error);
        }
    });

    socket.on('disconnect', async (reason) => {
        console.log(`[DOOR-DEVICE] Device ${serialNumber} disconnected. Reason: ${reason}`);

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
                console.error(`[DOOR-DEVICE] Database update failed on disconnect for ${serialNumber}:`, err);
            });

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
        } catch (error) {
            console.error(`[DOOR-DEVICE] Error handling disconnect for ${serialNumber}:`, error);

            try {
                clientNamespace.emit('door_disconnect', {
                    serialNumber,
                    deviceType: 'ESP8266 Direct',
                    reason: 'disconnect_with_error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                });
            } catch (notifyError) {
                console.error(`[DOOR-DEVICE] Failed to notify clients about disconnect:`, notifyError);
            }
        }
    });
};