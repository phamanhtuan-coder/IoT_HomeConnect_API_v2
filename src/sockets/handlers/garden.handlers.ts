// src/sockets/handlers/garden.handlers.ts
import { Namespace, Socket, Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import prisma from '../../config/database';

/**
 * Setup Arduino Mega Hub handlers for Garden System
 */
export const setupMegaGardenHandlers = (socket: Socket, io: Server, hubId: string) => {
    const clientNamespace = io.of('/client');

    console.log(`[MEGA-GARDEN] Setting up Arduino Mega Garden handlers for ${hubId}`);

    // Garden sensor data from Mega Hub
    socket.on('garden_sensor_data', (data) => {
        try {
            console.log(`[MEGA-GARDEN] Garden sensor data from ${hubId}:`, data);

            clientNamespace.to(`garden:${hubId}`).emit('garden_sensor_data', {
                ...data,
                hubId,
                systemType: 'garden',
                timestamp: new Date().toISOString()
            });

            // Also broadcast to all garden clients
            clientNamespace.emit('garden_data_update', {
                hubId,
                sensorData: data,
                systemType: 'garden',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[MEGA-GARDEN] Error in garden_sensor_data for ${hubId}:`, error);
        }
    });

    // Pump control responses from Arduino Mega
    socket.on('pump_response', (data) => {
        try {
            console.log(`[MEGA-GARDEN] Pump response from ${hubId}:`, data);

            clientNamespace.to(`garden:${hubId}`).emit('pump_response', {
                hubId,
                ...data,
                systemType: 'garden',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[MEGA-GARDEN] Error in pump_response for ${hubId}:`, error);
        }
    });

    // Garden automation status
    socket.on('garden_automation_status', (data) => {
        try {
            console.log(`[MEGA-GARDEN] Automation status from ${hubId}:`, data);

            clientNamespace.to(`garden:${hubId}`).emit('garden_automation_status', {
                hubId,
                ...data,
                systemType: 'garden',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[MEGA-GARDEN] Error in garden_automation_status for ${hubId}:`, error);
        }
    });

    // Handle garden commands from clients
    socket.on('garden_command', (data) => {
        try {
            console.log(`[MEGA-GARDEN] Garden command received at hub ${hubId}:`, data);

            // Process garden command (pump control, auto watering, etc.)
            socket.emit('garden_command_ack', {
                status: 'received',
                command: data.action,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[MEGA-GARDEN] Error in garden_command for ${hubId}:`, error);
        }
    });

    // Garden system health and diagnostics
    socket.on('garden_system_health', (data) => {
        try {
            console.log(`[MEGA-GARDEN] Garden system health from ${hubId}:`, data);

            clientNamespace.emit('garden_system_health', {
                hubId,
                ...data,
                systemType: 'garden',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[MEGA-GARDEN] Error in garden_system_health for ${hubId}:`, error);
        }
    });

    // ESP Garden Master connection status
    socket.on('garden_master_status', (data) => {
        try {
            console.log(`[MEGA-GARDEN] Garden master status from ${hubId}:`, data);

            clientNamespace.to(`garden:${hubId}`).emit('garden_master_status', {
                hubId,
                ...data,
                systemType: 'garden',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[MEGA-GARDEN] Error in garden_master_status for ${hubId}:`, error);
        }
    });

    // ESP07 Display connection status
    socket.on('garden_display_status', (data) => {
        try {
            console.log(`[MEGA-GARDEN] Garden display status from ${hubId}:`, data);

            clientNamespace.to(`garden:${hubId}`).emit('garden_display_status', {
                hubId,
                ...data,
                systemType: 'garden',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[MEGA-GARDEN] Error in garden_display_status for ${hubId}:`, error);
        }
    });
};

/**
 * Setup ESP Master Garden handlers
 */
export const setupGardenMasterHandlers = (socket: Socket, io: Server, serialNumber: string) => {
    const clientNamespace = io.of('/client');

    console.log(`[GARDEN-MASTER] Setting up ESP Master Garden handlers for ${serialNumber}`);

    // Garden data updates from ESP Master
    socket.on('garden_data', (data) => {
        try {
            console.log(`[GARDEN-MASTER] Garden data from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('garden_data', {
                ...data,
                serialNumber,
                deviceRole: 'Master',
                systemType: 'garden',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-MASTER] Error in garden_data for ${serialNumber}:`, error);
        }
    });

    // ESP-NOW communication status with ESP07
    socket.on('esp_now_status', (data) => {
        try {
            console.log(`[GARDEN-MASTER] ESP-NOW status from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('esp_now_status', {
                ...data,
                serialNumber,
                deviceRole: 'Master',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-MASTER] Error in esp_now_status for ${serialNumber}:`, error);
        }
    });

    // Garden command responses
    socket.on('command_response', (data) => {
        try {
            console.log(`[GARDEN-MASTER] Command response from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('garden_command_response', {
                ...data,
                serialNumber,
                deviceRole: 'Master',
                systemType: 'garden',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-MASTER] Error in command_response for ${serialNumber}:`, error);
        }
    });

    // Sensor data forwarding status
    socket.on('sensor_forward_status', (data) => {
        try {
            console.log(`[GARDEN-MASTER] Sensor forward status from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('sensor_forward_status', {
                ...data,
                serialNumber,
                deviceRole: 'Master',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-MASTER] Error in sensor_forward_status for ${serialNumber}:`, error);
        }
    });

    // Connection status with Arduino Mega Hub
    socket.on('mega_connection_status', (data) => {
        try {
            console.log(`[GARDEN-MASTER] Mega connection status from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('mega_connection_status', {
                ...data,
                serialNumber,
                deviceRole: 'Master',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-MASTER] Error in mega_connection_status for ${serialNumber}:`, error);
        }
    });

    // Heartbeat for connection monitoring
    socket.on('heartbeat', (data) => {
        try {
            console.log(`[GARDEN-MASTER] Heartbeat from ${serialNumber}:`, data);

            socket.emit('heartbeat_ack', {
                received: true,
                deviceType: 'ESP Garden Master',
                server_time: new Date().toISOString(),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-MASTER] Error in heartbeat for ${serialNumber}:`, error);
        }
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
        console.log(`[GARDEN-MASTER] ESP Master Garden ${serialNumber} disconnected. Reason: ${reason}`);

        try {
            clientNamespace.emit('garden_device_disconnect', {
                serialNumber,
                deviceType: 'ESP Garden Master',
                deviceRole: 'Master',
                systemType: 'garden',
                reason: reason,
                impact: 'Garden data forwarding lost',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-MASTER] Error in disconnect for ${serialNumber}:`, error);
        }
    });
};

/**
 * Setup ESP07 Garden Display handlers
 */
export const setupGardenDisplayHandlers = (socket: Socket, io: Server, serialNumber: string) => {
    const clientNamespace = io.of('/client');

    console.log(`[GARDEN-DISPLAY] Setting up ESP07 Garden Display handlers for ${serialNumber}`);

    // Display status updates
    socket.on('display_status', (data) => {
        try {
            console.log(`[GARDEN-DISPLAY] Display status from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('display_status', {
                ...data,
                serialNumber,
                deviceType: 'ESP07 Garden Display',
                deviceRole: 'Display',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-DISPLAY] Error in display_status for ${serialNumber}:`, error);
        }
    });

    // OLED display updates
    socket.on('oled_update', (data) => {
        try {
            console.log(`[GARDEN-DISPLAY] OLED update from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('oled_update', {
                ...data,
                serialNumber,
                displayType: 'OLED',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-DISPLAY] Error in oled_update for ${serialNumber}:`, error);
        }
    });

    // LCD display updates
    socket.on('lcd_update', (data) => {
        try {
            console.log(`[GARDEN-DISPLAY] LCD update from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('lcd_update', {
                ...data,
                serialNumber,
                displayType: 'LCD',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-DISPLAY] Error in lcd_update for ${serialNumber}:`, error);
        }
    });

    // RGB LED status updates
    socket.on('rgb_status_update', (data) => {
        try {
            console.log(`[GARDEN-DISPLAY] RGB status from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('rgb_status_update', {
                ...data,
                serialNumber,
                componentType: 'RGB_LED',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-DISPLAY] Error in rgb_status_update for ${serialNumber}:`, error);
        }
    });

    // Display command responses
    socket.on('command_response', (data) => {
        try {
            console.log(`[GARDEN-DISPLAY] Command response from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('garden_command_response', {
                ...data,
                serialNumber,
                deviceRole: 'Display',
                systemType: 'garden',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-DISPLAY] Error in command_response for ${serialNumber}:`, error);
        }
    });

    // Connection status with ESP Master Garden
    socket.on('master_connection_status', (data) => {
        try {
            console.log(`[GARDEN-DISPLAY] Master connection status from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('master_connection_status', {
                ...data,
                serialNumber,
                deviceRole: 'Display',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-DISPLAY] Error in master_connection_status for ${serialNumber}:`, error);
        }
    });

    // ESP-NOW data received from Master
    socket.on('esp_now_data_received', (data) => {
        try {
            console.log(`[GARDEN-DISPLAY] ESP-NOW data received from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('esp_now_data_received', {
                ...data,
                serialNumber,
                deviceRole: 'Display',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-DISPLAY] Error in esp_now_data_received for ${serialNumber}:`, error);
        }
    });

    // Display page rotation status
    socket.on('page_rotation_status', (data) => {
        try {
            console.log(`[GARDEN-DISPLAY] Page rotation status from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('page_rotation_status', {
                ...data,
                serialNumber,
                deviceRole: 'Display',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-DISPLAY] Error in page_rotation_status for ${serialNumber}:`, error);
        }
    });

    // Garden status determination (colors, status text)
    socket.on('garden_status_determined', (data) => {
        try {
            console.log(`[GARDEN-DISPLAY] Garden status determined from ${serialNumber}:`, data);

            clientNamespace.to(`garden:${serialNumber}`).emit('garden_status_determined', {
                ...data,
                serialNumber,
                deviceRole: 'Display',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-DISPLAY] Error in garden_status_determined for ${serialNumber}:`, error);
        }
    });

    // Heartbeat for connection monitoring
    socket.on('heartbeat', (data) => {
        try {
            console.log(`[GARDEN-DISPLAY] Heartbeat from ${serialNumber}:`, data);

            socket.emit('heartbeat_ack', {
                received: true,
                deviceType: 'ESP07 Garden Display',
                server_time: new Date().toISOString(),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-DISPLAY] Error in heartbeat for ${serialNumber}:`, error);
        }
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
        console.log(`[GARDEN-DISPLAY] ESP07 Garden Display ${serialNumber} disconnected. Reason: ${reason}`);

        try {
            clientNamespace.emit('garden_device_disconnect', {
                serialNumber,
                deviceType: 'ESP07 Garden Display',
                deviceRole: 'Display',
                systemType: 'garden',
                reason: reason,
                impact: 'Garden status display lost',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[GARDEN-DISPLAY] Error in disconnect for ${serialNumber}:`, error);
        }
    });
};

/**
 * Combined Garden System handlers setup
 */
export const setupGardenSystemHandlers = (socket: Socket, io: Server, serialNumber: string, isDisplay: boolean) => {
    if (isDisplay) {
        setupGardenDisplayHandlers(socket, io, serialNumber);
    } else {
        setupGardenMasterHandlers(socket, io, serialNumber);
    }
};