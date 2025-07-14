import { Socket, Server } from 'socket.io';
import prisma from '../../config/database';
import { updateHubStatus, getHubManagedDevices, handleHubDisconnection } from '../hub.socket';

export const setupDoorDeviceHandlers = (socket: Socket, io: Server, serialNumber: string) => {
    const clientNamespace = io.of('/client');

    console.log(`[DOOR] Setting up handlers for ${serialNumber}`);

    // Handle device online - update status with dynamic door type
    socket.on('device_online', async (data) => {
        try {
            console.log(`[DOOR] Device online: ${serialNumber}`);

            // Simple acknowledgment
            socket.emit('device_online_ack', {
                status: 'connected',
                serialNumber,
                timestamp: new Date().toISOString()
            });

            // ✅ UPDATE DATABASE WITH ONLINE STATUS AND DYNAMIC DOOR TYPE
            await prisma.devices.update({
                where: { serial_number: serialNumber },
                data: {
                    link_status: 'linked',
                    updated_at: new Date(),
                    attribute: {
                        device_type: data.deviceType || "ESP01_DOOR",
                        door_type: data.door_type || (data.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
                        connection_type: "direct",
                        status: "online",
                        last_seen: new Date().toISOString()
                    }
                }
            });

            // Notify clients
            clientNamespace.emit('device_connect', {
                serialNumber,
                deviceType: data.deviceType || 'ESP01_DOOR',
                door_type: data.door_type || (data.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
                status: 'online',
                connectionType: 'direct',
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

            // ✅ UPDATE DATABASE WITH DOOR STATE AND DYNAMIC DOOR TYPE
            const doorAttribute = {
                door_type: data.door_type || (data.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
                door_state: doorState,
                servo_angle: servoAngle,
                last_command: lastCommand,
                power_status: doorState === 'open' || doorState === 'opening',
                last_seen: new Date().toISOString(),
                command_timeout: 5000,
                connection_type: "direct"
            };

            await prisma.devices.update({
                where: { serial_number: targetSerial },
                data: {
                    attribute: doorAttribute,
                    power_status: doorAttribute.power_status,
                    updated_at: new Date()
                }
            });

            // Send to clients
            clientNamespace.to(`door:${targetSerial}`).emit('door_command_response', {
                serialNumber: targetSerial,
                door_state: doorState,
                servo_angle: servoAngle,
                last_command: lastCommand,
                door_type: doorAttribute.door_type,
                success: data.success || data.s === 1,
                timestamp: new Date().toISOString()
            });

            console.log(`[DOOR] Updated door state in database for ${targetSerial}: ${doorState}`);

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

            // ✅ UPDATE DATABASE WITH CURRENT STATUS AND DYNAMIC DOOR TYPE
            const doorAttribute = {
                door_type: data.door_type || (data.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
                door_state: doorState,
                servo_angle: servoAngle,
                last_command: "STATUS",
                power_status: doorState === 'open' || doorState === 'opening',
                last_seen: new Date().toISOString(),
                command_timeout: 5000,
                connection_type: "direct"
            };

            await prisma.devices.update({
                where: { serial_number: targetSerial },
                data: {
                    attribute: doorAttribute,
                    power_status: doorAttribute.power_status,
                    updated_at: new Date()
                }
            });

            // Send to clients
            clientNamespace.to(`door:${targetSerial}`).emit('door_status', {
                serialNumber: targetSerial,
                door_state: doorState,
                servo_angle: servoAngle,
                door_type: doorAttribute.door_type,
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
                door_type: data.door_type || (data.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
                servo_closed_angle: 0,
                servo_open_angle: 90,
                last_seen: new Date().toISOString(),
                connection_type: "direct"
            };

            if (data.type === 'servo_angles' || data.action === 'ANG') {
                configData.servo_closed_angle = data.v1 || 0;
                configData.servo_open_angle = data.v2 || 90;
            }

            // ✅ UPDATE DATABASE WITH CONFIG AND DYNAMIC DOOR TYPE
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

    // Handle disconnect - update database
    socket.on('disconnect', async (reason) => {
        console.log(`[DOOR] ${serialNumber} disconnected: ${reason}`);

        try {
            // ✅ UPDATE DATABASE TO SHOW OFFLINE
            const currentDevice = await prisma.devices.findFirst({
                where: { serial_number: serialNumber }
            });

            if (currentDevice) {
                const currentAttribute = currentDevice.attribute as any || {};
                const offlineAttribute = {
                    ...currentAttribute,
                    door_type: currentAttribute.door_type || (currentDevice.device_type === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
                    power_status: false,
                    status: "offline",
                    last_seen: new Date().toISOString(),
                    offline_reason: reason,
                    connection_type: "direct"
                };

                await prisma.devices.update({
                    where: { serial_number: serialNumber },
                    data: {
                        attribute: offlineAttribute,
                        link_status: 'unlinked',
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

export const setupDoorHubHandlers = (socket: Socket, io: Server, hubSerial: string) => {
    const clientNamespace = io.of('/client');

    console.log(`[HUB] Setting up database-integrated handlers for ${hubSerial}`);

    socket.on('device_online', async (data) => {
        try {
            console.log(`[HUB] Hub online: ${hubSerial}`);

            socket.emit('device_online_ack', {
                status: 'connected',
                deviceType: 'ESP_SOCKET_HUB',
                timestamp: new Date().toISOString()
            });

            // ✅ UPDATE HUB STATUS IN DATABASE
            await updateHubStatus(hubSerial, true);

            // ✅ GET AND REGISTER MANAGED DEVICES
            const managedDevices = await getHubManagedDevices(hubSerial);
            console.log(`[HUB] Hub ${hubSerial} managing ${managedDevices.length} devices:`, managedDevices);

            // ✅ UPDATE ALL MANAGED DEVICES TO SHOW HUB CONNECTION
            for (const deviceSerial of managedDevices) {
                try {
                    await prisma.devices.update({
                        where: { serial_number: deviceSerial },
                        data: {
                            link_status: 'linked',
                            updated_at: new Date(),
                            attribute: {
                                device_type: 'ESP01_DOOR',
                                door_type: data.door_type || (data.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
                                connection_type: 'hub_managed',
                                hub_serial: hubSerial,
                                status: 'online',
                                last_seen: new Date().toISOString()
                            }
                        }
                    });

                    // Notify clients about device coming online via hub
                    clientNamespace.emit('device_connect', {
                        serialNumber: deviceSerial,
                        deviceType: 'ESP01_DOOR',
                        door_type: data.door_type || (data.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
                        connectionType: 'hub_managed',
                        hubSerial: hubSerial,
                        status: 'online',
                        timestamp: new Date().toISOString()
                    });

                } catch (deviceError) {
                    console.error(`[HUB] Error updating device ${deviceSerial}:`, deviceError);
                }
            }

            clientNamespace.emit('hub_online', {
                serialNumber: hubSerial,
                deviceType: 'ESP_SOCKET_HUB',
                status: 'online',
                managedDevicesCount: managedDevices.length,
                managedDevices: managedDevices,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[HUB] Error in device_online for ${hubSerial}:`, error);
        }
    });

    // ✅ HANDLE RESPONSES FOR MANAGED DEVICES
    socket.on('command_response', async (data) => {
        try {
            const targetSerial = data.deviceId || data.serialNumber || data.d;

            if (!targetSerial) {
                console.error(`[HUB] Command response missing target serial`);
                return;
            }

            console.log(`[HUB] Command response from hub ${hubSerial} for device ${targetSerial}:`, data);

            // Parse response data
            let doorState = 'unknown';
            let servoAngle = 0;
            let lastCommand = 'UNKNOWN';

            if (data.compact_data || data.s !== undefined) {
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
                doorState = data.door_state || 'unknown';
                servoAngle = data.servo_angle || data.angle || 0;
                lastCommand = data.command || data.action || 'UNKNOWN';
            }

            // ✅ UPDATE DATABASE FOR MANAGED DEVICE WITH DYNAMIC DOOR TYPE
            const doorAttribute = {
                door_type: data.door_type || (data.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
                door_state: doorState,
                servo_angle: servoAngle,
                last_command: lastCommand,
                power_status: doorState === 'open' || doorState === 'opening',
                last_seen: new Date().toISOString(),
                command_timeout: 5000,
                connection_type: "hub_managed",
                hub_serial: hubSerial
            };

            await prisma.devices.update({
                where: { serial_number: targetSerial },
                data: {
                    attribute: doorAttribute,
                    power_status: doorAttribute.power_status,
                    updated_at: new Date()
                }
            });

            // Send to clients
            clientNamespace.to(`door:${targetSerial}`).emit('door_command_response', {
                serialNumber: targetSerial,
                door_state: doorState,
                servo_angle: servoAngle,
                door_type: doorAttribute.door_type,
                last_command: lastCommand,
                success: data.success || data.s === 1,
                via_hub: hubSerial,
                timestamp: new Date().toISOString()
            });

            console.log(`[HUB] Updated database for managed device ${targetSerial}: ${doorState}`);

        } catch (error) {
            console.error(`[HUB] Error processing command response:`, error);
        }
    });

    // ✅ HANDLE STATUS UPDATES FOR MANAGED DEVICES
    socket.on('deviceStatus', async (data) => {
        try {
            const targetSerial = data.deviceId || data.serialNumber || data.d;

            if (!targetSerial) {
                console.error(`[HUB] Device status missing target serial`);
                return;
            }

            console.log(`[HUB] Device status from hub ${hubSerial} for device ${targetSerial}:`, data);

            let doorState = 'unknown';
            let servoAngle = 0;

            if (data.compact_data || data.s !== undefined) {
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

            // ✅ UPDATE DATABASE FOR MANAGED DEVICE STATUS WITH DYNAMIC DOOR TYPE
            const doorAttribute = {
                door_type: data.door_type || (data.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
                door_state: doorState,
                servo_angle: servoAngle,
                last_command: "STATUS",
                power_status: doorState === 'open' || doorState === 'opening',
                last_seen: new Date().toISOString(),
                command_timeout: 5000,
                connection_type: "hub_managed",
                hub_serial: hubSerial
            };

            await prisma.devices.update({
                where: { serial_number: targetSerial },
                data: {
                    attribute: doorAttribute,
                    power_status: doorAttribute.power_status,
                    updated_at: new Date()
                }
            });

            // Send to clients
            clientNamespace.to(`door:${targetSerial}`).emit('door_status', {
                serialNumber: targetSerial,
                door_state: doorState,
                servo_angle: servoAngle,
                door_type: doorAttribute.door_type,
                online: true,
                via_hub: hubSerial,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[HUB] Error processing device status:`, error);
        }
    });

    // ✅ HANDLE HUB DISCONNECT WITH DATABASE UPDATE
    socket.on('disconnect', async (reason) => {
        console.log(`[HUB] Hub ${hubSerial} disconnected: ${reason}`);

        try {
            // ✅ UPDATE HUB STATUS IN DATABASE
            await updateHubStatus(hubSerial, false);

            // ✅ GET MANAGED DEVICES AND MARK THEM OFFLINE
            const managedDevices = await getHubManagedDevices(hubSerial);

            for (const deviceSerial of managedDevices) {
                try {
                    const currentDevice = await prisma.devices.findFirst({
                        where: { serial_number: deviceSerial }
                    });

                    if (currentDevice) {
                        const currentAttribute = currentDevice.attribute as any || {};
                        const offlineAttribute = {
                            ...currentAttribute,
                            door_type: currentAttribute.door_type || (currentDevice.device_type === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
                            status: "offline",
                            last_seen: new Date().toISOString(),
                            offline_reason: `Hub ${hubSerial} disconnected: ${reason}`,
                            connection_type: "hub_managed",
                            hub_serial: hubSerial
                        };

                        await prisma.devices.update({
                            where: { serial_number: deviceSerial },
                            data: {
                                attribute: offlineAttribute,
                                link_status: 'unlinked',
                                updated_at: new Date()
                            }
                        });

                        // Notify clients about device going offline
                        clientNamespace.emit('door_disconnect', {
                            serialNumber: deviceSerial,
                            reason: `Hub disconnected: ${reason}`,
                            hubSerial: hubSerial,
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch (deviceError) {
                    console.error(`[HUB] Error updating offline device ${deviceSerial}:`, deviceError);
                }
            }

            // Handle disconnection in hub registry
            handleHubDisconnection(hubSerial);

            clientNamespace.emit('hub_disconnect', {
                serialNumber: hubSerial,
                reason: reason,
                impact: `${managedDevices.length} managed devices affected`,
                affectedDevices: managedDevices,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[HUB] Error updating offline status for hub ${hubSerial}:`, error);
        }
    });

    // Hub ping/pong
    socket.on('ping', () => {
        socket.emit('pong', {
            timestamp: new Date().toISOString(),
            hubSerial
        });
    });
};

// ESP-01 Event Handlers (unchanged)
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
                door_type: data.door_type || (data.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
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
                door_type: data.door_type || (data.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
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
                door_type: data.door_type || (data.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
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

// Utility functions (unchanged)
function expandCompactResponse(compactData: any): any {
    return {
        success: compactData.s === 1 || compactData.s === "1" || compactData.success === true,
        result: compactData.r || compactData.result || "processed",
        deviceId: compactData.d || compactData.deviceId,
        command: compactData.c || compactData.command,
        servo_angle: compactData.a || compactData.servo_angle || compactData.angle || 0,
        door_type: compactData.dt || (compactData.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
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
        door_type: compactData.dt || (compactData.deviceType === "ESP32_ROLLING_DOOR" ? "ROLLING" : "SERVO"),
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