// src/sockets/device.socket.ts
import { Server, Socket, Namespace } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import redisClient from '../utils/redis';
import {DeviceSocket, ServerToClientEvents, ClientToServerEvents, LEDPresetData, LEDEffectData} from '../types/socket';
import { ErrorCodes, throwError } from '../utils/errors';
import admin from '../config/firebase';
import AlertService from '../services/alert.service';
import NotificationService from '../services/notification.service';
import { NotificationType } from '../types/notification';
import HourlyValueService from '../services/hourly-value.service';
import {
    handleDeviceOnline,
    handleDeviceCapabilities,
    handleSensorData,
    handleDeviceDisconnect,
    validateDeviceAccess
} from './handlers/device.handlers';

const prisma = new PrismaClient();
const alertService = new AlertService();
const notificationService = new NotificationService();
const hourlyValueService = new HourlyValueService();

const ALERT_TYPES = {
    GAS_HIGH: 1,
    TEMP_HIGH: 2,
    DEVICE_DISCONNECT: 3,
};

const ALERT_MESSAGES = {
    GAS_HIGH: 'KHẨN CẤP! Nồng độ khí quá cao!',
    TEMP_HIGH: 'KHẨN CẤP! Nhiệt độ quá cao!',
    DEVICE_DISCONNECT: 'Device has been disconnected!',
};

/**
 * Detect if client is ESP8266 based on connection parameters
 */
const detectESP8266Client = (socket: Socket): boolean => {
    const userAgent = socket.handshake.headers['user-agent'] || '';
    const query = socket.handshake.query;

    // ESP8266 detection criteria
    const isESP8266 = userAgent.includes('ESP8266') ||
        userAgent.includes('ArduinoWebSockets') ||
        query.client_type === 'esp8266' ||
        query.device_type === 'esp8266';

    return isESP8266;
};

export const setupDeviceSocket = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    // Giữ nguyên namespace /device như trong Postman
    const deviceNamespace = io.of('/device');
    const clientNamespace = io.of('/client');

    // ============= ESP8266 CONNECTION LOGGING =============
    console.log("🔧 Device Socket setup with ESP8266 compatibility:");
    console.log("   - Engine.IO v3 support: ENABLED");
    console.log("   - Namespaces: /device (IoT), /client (Apps)");
    console.log("   - ESP8266 optimizations: ACTIVE");

    // IoT Device connections (including ESP8266)
    deviceNamespace.on('connection', async (socket: DeviceSocket) => {
        const isESP8266 = detectESP8266Client(socket);
        const clientType = isESP8266 ? 'ESP8266' : 'IoT Device';

        console.log(`🔌 New ${clientType} connection attempt to /device - Socket ID: ${socket.id}`);

        if (isESP8266) {
            console.log(`📡 ESP8266 client detected:`, {
                userAgent: socket.handshake.headers['user-agent'],
                transport: socket.conn.transport.name,
                engineIOVersion: socket.conn.protocol
            });
        }

        const { deviceId, isIoTDevice = 'true', client_type, firmware_version } = socket.handshake.query as {
            deviceId?: string;
            isIoTDevice?: string;
            client_type?: string;
            firmware_version?: string;
        };

        console.log(`📋 ${clientType} connection params:`, {
            deviceId,
            isIoTDevice,
            client_type,
            firmware_version: firmware_version || 'unknown'
        });

        if (!deviceId) {
            console.log(`❌ ${clientType} connection rejected: Missing deviceId`);
            socket.disconnect();
            return;
        }

        socket.data = {
            deviceId,
            isIoTDevice: isIoTDevice === 'true',
            isESP8266,
            firmware_version
        };

        try {
            const device = await prisma.devices.findUnique({
                where: { serial_number: deviceId, is_deleted: false },
                include: {
                    account: true,
                    spaces: true,
                    device_templates: true,
                    firmware: true
                },
            });

            if (!device) {
                console.log(`❌ Device not found: ${deviceId}`);
                socket.disconnect();
                return;
            }

            console.log(`📱 Device found in database: ${deviceId} - Owner: ${device.account_id} (${clientType})`);

            // Update device link status with ESP8266 info
            const updateData: any = {
                link_status: 'linked',
                updated_at: new Date()
            };

            // ESP8266 specific updates
            if (isESP8266 && firmware_version) {
                updateData.firmware_version = firmware_version;
                console.log(`📡 Updated ESP8266 firmware version: ${firmware_version}`);
            }

            await prisma.devices.update({
                where: { serial_number: deviceId },
                data: updateData,
            });

            // Create notification for device owner
            if (device.account_id) {
                await redisClient.setex(`device:${deviceId}:account`, 3600, device.account_id);
                await notificationService.createNotification({
                    account_id: device.account_id,
                    text: `${clientType} ${deviceId} is now online.`,
                    type: NotificationType.SYSTEM,
                });
            }

            socket.join(`device:${deviceId}`);

            // Notify clients about device connection
            clientNamespace.emit('device_connect', {
                deviceId,
                deviceType: clientType,
                timestamp: new Date().toISOString()
            });
            clientNamespace.emit('device_online', {
                deviceId,
                deviceType: clientType,
                firmware_version,
                timestamp: new Date().toISOString()
            });

            console.log(`✅ ${clientType} connected successfully: ${deviceId}`);

            // ============= SOCKET EVENT HANDLERS =============

            socket.on('device_online', (data) => {
                console.log(`📡 Device online event from ${deviceId} (${clientType}):`, data);
                handleDeviceOnline(socket, clientNamespace, data, prisma);
            });

            socket.on('device_capabilities', (data) => {
                console.log(`⚙️  Device capabilities from ${deviceId} (${clientType}):`, data);
                handleDeviceCapabilities(socket, clientNamespace, data, prisma);
            });

            socket.on('sensorData', (data) => {
                console.log(`🌡️  Sensor data from ${deviceId} (${clientType}):`, data);
                handleSensorData(socket, data, clientNamespace, prisma, alertService, notificationService, hourlyValueService);
            });

            // ESP8266 Fire Alarm specific events
            socket.on('alarm_trigger', (data) => {
                console.log(`🚨 FIRE ALARM TRIGGERED from ${deviceId} (${clientType}):`, data);

                // Broadcast emergency alert to all clients
                clientNamespace.emit('emergency_alert', {
                    deviceId,
                    type: 'fire_alarm',
                    severity: 'critical',
                    data,
                    timestamp: new Date().toISOString()
                });

                // Also emit to device-specific room with correct alarmAlert format
                clientNamespace.to(`device:${deviceId}`).emit('alarmAlert', {
                    deviceId,
                    alarmActive: true,
                    temperature: data.temperature,
                    gasValue: data.gas_level || data.smoke_level,
                    severity: data.severity,
                    alarm_type: data.alarm_type,
                    location: data.location,
                    timestamp: new Date().toISOString()
                });
            });

            socket.on('fire_detected', (data) => {
                console.log(`🔥 Fire detection from ${deviceId} (${clientType}):`, data);

                clientNamespace.emit('fire_alert', {
                    ...data,
                    timestamp: new Date().toISOString()
                });
            });

            socket.on('smoke_detected', (data) => {
                console.log(`💨 Smoke detection from ${deviceId} (${clientType}):`, data);

                clientNamespace.emit('smoke_alert', {
                    ...data,
                    timestamp: new Date().toISOString()
                });
            });

            // ESP8266 Status events
            socket.on('esp8266_status', (data) => {
                console.log(`📊 ESP8266 status from ${deviceId}:`, data);

                clientNamespace.to(`device:${deviceId}`).emit('esp8266_status', {
                    ...data,
                    timestamp: new Date().toISOString()
                });
            });

            // Existing device events (maintained for compatibility)
            socket.on('deviceStatus', (data) => {
                console.log(`📊 Device status from ${deviceId} (${clientType}):`, data);
                clientNamespace.to(`device:${deviceId}`).emit('deviceStatus', data);
            });

            socket.on('alarmAlert', (data) => {
                console.log(`🚨 Alarm alert from ${deviceId} (${clientType}):`, data);
                clientNamespace.to(`device:${deviceId}`).emit('alarmAlert', data);
            });

            // Command response from IoT device back to client
            socket.on('command_response', (responseData) => {
                console.log(`📥 Command response from device ${deviceId} (${clientType}):`, responseData);
                clientNamespace.to(`device:${deviceId}`).emit('command_response', {
                    ...responseData,
                    deviceId,
                    timestamp: new Date().toISOString()
                });
            });

            // Command execution status
            socket.on('command_status', (statusData) => {
                console.log(`⚡ Command status from device ${deviceId} (${clientType}):`, statusData);
                clientNamespace.to(`device:${deviceId}`).emit('command_status', {
                    ...statusData,
                    deviceId,
                    timestamp: new Date().toISOString()
                });
            });

            // ============= ESP8266 SPECIFIC PING/PONG =============
            socket.on('ping', () => {
                console.log(`🏓 Ping from ${clientType} ${deviceId}`);
                socket.emit('pong', { timestamp: new Date().toISOString() });
            });

            // ESP8266 keep-alive (alternative to ping)
            socket.on('heartbeat', (data) => {
                console.log(`💓 Heartbeat from ${clientType} ${deviceId}:`, data);
                socket.emit('heartbeat_ack', {
                    received: true,
                    timestamp: new Date().toISOString()
                });
            });

            // ============= ERROR HANDLING FOR ESP8266 =============
            socket.on('error', (error) => {
                console.error(`❌ Socket error from ${clientType} ${deviceId}:`, error);
            });

            socket.on('connect_error', (error) => {
                console.error(`❌ Connection error from ${clientType} ${deviceId}:`, error);
            });

            socket.on('disconnect', (reason) => {
                console.log(`🔌 ${clientType} ${deviceId} disconnecting... Reason: ${reason}`);
                handleDeviceDisconnect(socket, clientNamespace, prisma, notificationService);
            });

        } catch (error) {
            console.error(`❌ ${clientType} socket error for ${deviceId}:`, error);
            socket.disconnect();
        }
    });

    // Client App connections (Mobile/Web) - Namespace: /client
    clientNamespace.on('connection', async (socket: DeviceSocket) => {
        console.log(`📱 New CLIENT connection attempt to /client - Socket ID: ${socket.id}`);

        const { deviceId, accountId } = socket.handshake.query as {
            deviceId?: string;
            accountId?: string;
        };

        console.log(`📋 Client connection params - deviceId: ${deviceId}, accountId: ${accountId}`);

        if (!deviceId || !accountId) {
            console.log('❌ CLIENT connection rejected: Missing deviceId or accountId');
            socket.disconnect();
            return;
        }

        socket.data = { deviceId, accountId, isIoTDevice: false };

        try {
            // Validate device access
            const hasAccess = await validateDeviceAccess(deviceId, accountId, prisma);
            if (!hasAccess) {
                console.log(`❌ Access denied for user ${accountId} to device ${deviceId}`);
                socket.disconnect();
                return;
            }

            socket.join(`device:${deviceId}`);
            console.log(`✅ CLIENT connected to device ${deviceId} by user ${accountId}`);

            // Real-time device monitoring
            socket.on('start_real_time_device', ({ deviceId: targetDeviceId }) => {
                console.log(`🔴 Client requesting real-time for device: ${targetDeviceId}`);
                if (targetDeviceId === deviceId) {
                    socket.join(`device:${deviceId}:realtime`);
                    console.log(`✅ Started real-time monitoring for device ${deviceId} - Client in room: device:${deviceId}:realtime`);

                    // Confirm to client
                    socket.emit('realtime_started', {
                        deviceId,
                        status: 'started',
                        timestamp: new Date().toISOString()
                    });
                } else {
                    console.log(`❌ Device ID mismatch: requested=${targetDeviceId}, connected=${deviceId}`);
                }
            });

            socket.on('stop_real_time_device', ({ deviceId: targetDeviceId }) => {
                console.log(`🔵 Client stopping real-time for device: ${targetDeviceId}`);
                if (targetDeviceId === deviceId) {
                    socket.leave(`device:${deviceId}:realtime`);
                    console.log(`✅ Stopped real-time monitoring for device ${deviceId}`);

                    // Confirm to client
                    socket.emit('realtime_stopped', {
                        deviceId,
                        status: 'stopped',
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // ============= COMMAND HANDLING FOR ESP8266 =============
            // Forward commands to IoT device (including ESP8266)
            socket.on('command', (commandData) => {
                console.log(`🎮 Generic command from client for device ${deviceId}:`, commandData);

                // Only handle non-LED specific commands here
                const isLEDCommand = ['setEffect', 'applyPreset', 'stopEffect', 'updateLEDState'].includes(commandData.action);

                if (isLEDCommand) {
                    console.log(`⚠️  LED command received via generic handler. Use dedicated LED events instead.`);
                    // Still forward but warn - for backward compatibility
                }

                // ESP8266 specific: Simplify command structure for memory constraints
                const simplifiedCommand = {
                    action: commandData.action,
                    state: commandData.state,
                    timestamp: new Date().toISOString()
                };

                // Forward command to IoT device in device namespace
                deviceNamespace.to(`device:${deviceId}`).emit('command', {
                    ...simplifiedCommand,
                    fromClient: accountId
                });

                // Send acknowledgment back to client
                socket.emit('command_sent', {
                    success: true,
                    deviceId,
                    command: simplifiedCommand,
                    timestamp: new Date().toISOString()
                });

                console.log(`📤 Generic command forwarded to device ${deviceId} (ESP8266 compatible):`, simplifiedCommand);
            });
            // ESP8266 specific: Reset alarm command
            socket.on('reset_alarm', (data) => {
                console.log(`🔄 Reset alarm command for device ${deviceId}:`, data);

                deviceNamespace.to(`device:${deviceId}`).emit('reset_alarm', {
                    deviceId,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                });

                socket.emit('reset_alarm_sent', {
                    success: true,
                    deviceId,
                    timestamp: new Date().toISOString()
                });
            });

            // ESP8266 specific: Test alarm command
            socket.on('test_alarm', (data) => {
                console.log(`🧪 Test alarm command for device ${deviceId}:`, data);

                deviceNamespace.to(`device:${deviceId}`).emit('test_alarm', {
                    deviceId,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                });

                socket.emit('test_alarm_sent', {
                    success: true,
                    deviceId,
                    timestamp: new Date().toISOString()
                });
            });

            // ESP8266 specific: Configuration update
            socket.on('update_config', (configData) => {
                console.log(`⚙️ Config update for ESP8266 device ${deviceId}:`, configData);

                // Validate config size for ESP8266 memory constraints
                const configSize = JSON.stringify(configData).length;
                if (configSize > 1024) { // 1KB limit
                    socket.emit('config_error', {
                        error: 'Configuration too large for ESP8266',
                        maxSize: 1024,
                        currentSize: configSize
                    });
                    return;
                }

                deviceNamespace.to(`device:${deviceId}`).emit('update_config', {
                    config: configData,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                });

                socket.emit('config_update_sent', {
                    success: true,
                    deviceId,
                    configSize,
                    timestamp: new Date().toISOString()
                });
            });

            // LED Effects WebSocket commands

            socket.on('setEffect', (effectData: {
                effect: string;
                speed?: number;
                count?: number;
                duration?: number;
                color1?: string;
                color2?: string;
            }) => {
                console.log(`🌟 Set LED effect command for device ${deviceId}:`, effectData);

                const ledCommand = {
                    action: 'setEffect',
                    effect: effectData.effect,
                    speed: effectData.speed || 500,
                    count: effectData.count || 0,
                    duration: effectData.duration || 0,
                    color1: effectData.color1 || '#FF0000',
                    color2: effectData.color2 || '#0000FF',
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                };

                deviceNamespace.to(`device:${deviceId}`).emit('command', ledCommand);

                socket.emit('led_effect_set', {
                    deviceId,
                    effect: effectData.effect,
                    speed: effectData.speed || 500,
                    count: effectData.count || 0,
                    duration: effectData.duration || 0,
                    color1: effectData.color1 || '#FF0000',
                    color2: effectData.color2 || '#0000FF',
                    timestamp: new Date().toISOString()
                } as LEDEffectData);

                console.log(`📤 LED effect command forwarded to device ${deviceId}:`, ledCommand);
            });

            socket.on('applyPreset', (presetData: { preset: string; duration?: number }) => {
                console.log(`🎨 Apply LED preset command for device ${deviceId}:`, presetData);

                const presets: Record<string, {
                    effect: string;
                    speed: number;
                    count: number;
                    color1: string;
                    color2: string;
                }> = {
                    party_mode: { effect: 'rainbow', speed: 200, count: 0, color1: '#FF0000', color2: '#0000FF' },
                    relaxation_mode: { effect: 'breathe', speed: 2000, count: 0, color1: '#9370DB', color2: '#9370DB' },
                    gaming_mode: { effect: 'chase', speed: 150, count: 0, color1: '#00FF80', color2: '#FF0080' },
                    alarm_mode: { effect: 'strobe', speed: 200, count: 20, color1: '#FF0000', color2: '#FF0000' },
                    sleep_mode: { effect: 'fade', speed: 5000, count: 0, color1: '#FFB366', color2: '#2F1B14' },
                    wake_up_mode: { effect: 'fade', speed: 2000, count: 0, color1: '#330000', color2: '#FFB366' },
                    focus_mode: { effect: 'solid', speed: 0, count: 0, color1: '#4169E1', color2: '#4169E1' },
                    movie_mode: { effect: 'breathe', speed: 3000, count: 0, color1: '#000080', color2: '#000080' },
                    romantic_mode: { effect: 'pulse', speed: 1000, count: 0, color1: '#FF1493', color2: '#FF69B4' },
                    celebration_mode: { effect: 'sparkle', speed: 100, count: 0, color1: '#FFD700', color2: '#FFFFFF' }
                };

                const preset = presets[presetData.preset];

                if (preset) {
                    const ledCommand = {
                        action: 'setEffect',
                        effect: preset.effect,
                        speed: preset.speed,
                        count: preset.count,
                        duration: presetData.duration || 0,
                        color1: preset.color1,
                        color2: preset.color2,
                        fromClient: accountId,
                        timestamp: new Date().toISOString()
                    };

                    deviceNamespace.to(`device:${deviceId}`).emit('command', ledCommand);

                    socket.emit('led_preset_applied', {
                        deviceId,
                        preset: presetData.preset,
                        duration: presetData.duration || 0,
                        timestamp: new Date().toISOString(),
                        // Add the missing fields
                        effect: preset.effect,
                        speed: preset.speed,
                        color1: preset.color1,
                        color2: preset.color2
                    } as LEDPresetData);

                    console.log(`📤 LED preset '${presetData.preset}' converted to setEffect and forwarded:`, ledCommand);
                } else {
                    console.warn(`❌ Unknown preset: ${presetData.preset}`);
                    socket.emit('led_preset_error', {
                        deviceId,
                        error: `Unknown preset: ${presetData.preset}`,
                        available_presets: Object.keys(presets),
                        timestamp: new Date().toISOString()
                    });
                }
            });

            socket.on('updateLEDState', (stateData: {
                power_status?: boolean;
                color?: string;
                brightness?: number;
            }) => {
                console.log(`💡 Update LED state command for device ${deviceId}:`, stateData);

                const stateCommand = {
                    action: 'updateState',
                    state: {
                        power_status: stateData.power_status,
                        color: stateData.color,
                        brightness: stateData.brightness
                    },
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                };

                deviceNamespace.to(`device:${deviceId}`).emit('command', stateCommand);

                socket.emit('led_state_updated', {
                    deviceId,
                    state: stateCommand.state,
                    timestamp: new Date().toISOString()
                });

                console.log(`📤 LED state update forwarded to device ${deviceId}:`, stateCommand);
            });

            socket.on('getLEDCapabilities', () => {
                console.log(`🔍 LED capabilities request for device ${deviceId}`);

                const ledCapabilities = {
                    deviceId,
                    supported_effects: [
                        'solid', 'blink', 'breathe', 'rainbow', 'chase',
                        'fade', 'strobe', 'colorWave', 'pulse', 'sparkle'
                    ],
                    supported_presets: [
                        'party_mode', 'relaxation_mode', 'gaming_mode', 'alarm_mode',
                        'sleep_mode', 'wake_up_mode', 'focus_mode', 'movie_mode',
                        'romantic_mode', 'celebration_mode'
                    ],
                    parameters: {
                        speed: { min: 50, max: 5000, default: 500 },
                        brightness: { min: 0, max: 100, default: 100 },
                        count: { min: 0, max: 100, default: 0 },
                        duration: { min: 0, max: 60000, default: 0 }
                    },
                    timestamp: new Date().toISOString()
                };

                socket.emit('led_capabilities', ledCapabilities);
                console.log(`📤 LED capabilities sent for device ${deviceId}`);
            });

            socket.on('disconnect', () => {
                console.log(`📱 CLIENT disconnected from device ${deviceId} (user: ${accountId})`);
            });


        } catch (error) {
            console.error(`❌ Client socket error:`, error);
            socket.disconnect();
        }
    });

    // ============= ESP8266 COMPATIBILITY MIDDLEWARE =============

    // Add middleware to handle ESP8266 specific connection issues
    deviceNamespace.use((socket, next) => {
        const isESP8266 = detectESP8266Client(socket);

        if (isESP8266) {
            console.log(`🔧 ESP8266 middleware: Processing connection for ${socket.id}`);

            // Set ESP8266 specific timeout handling (no callback for ESP8266 compatibility)
            socket.emit('connection_test', { test: true });

            // Log connection test without waiting for response
            setTimeout(() => {
                console.log(`✅ ESP8266 connection test sent for ${socket.id}`);
            }, 1000);
        }

        next();
    });

    // Global error handler for ESP8266 issues
    deviceNamespace.on('connect_error', (err) => {
        console.error('🔧 Device namespace connection error (possibly ESP8266):', {
            code: err.code,
            message: err.message,
            type: err.type
        });
    });

    console.log('✅ Device socket setup completed with ESP8266 compatibility');
};

export { ALERT_TYPES, ALERT_MESSAGES };