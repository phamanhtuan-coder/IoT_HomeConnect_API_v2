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
import AutomationService from '../services/automation.service';
import {
    handleDeviceOnline,
    handleDeviceCapabilities,
    handleSensorData,
    handleDeviceDisconnect,
    validateDeviceAccess
} from './handlers/device.handlers';
import DeviceLinksService from '../services/device-links.service';

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

    // Set socket instance for automation service
    AutomationService.setSocketInstance(io);

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

        const { serialNumber, isIoTDevice = 'true', client_type, firmware_version } = socket.handshake.query as {
            serialNumber?: string;
            isIoTDevice?: string;
            client_type?: string;
            firmware_version?: string;
        };

        console.log(`📋 ${clientType} connection params:`, {
            serialNumber,
            isIoTDevice,
            client_type,
            firmware_version: firmware_version || 'unknown'
        });

        if (!serialNumber) {
            console.log(`❌ ${clientType} connection rejected: Missing serialNumber`);
            socket.disconnect();
            return;
        }

        socket.data = {
            serialNumber,
            isIoTDevice: isIoTDevice === 'true',
            isESP8266,
            firmware_version
        };

        try {
            const device = await prisma.devices.findFirst({
                where: { serial_number: serialNumber, is_deleted: false },
                include: {
                    account: true,
                    spaces: true,
                    device_templates: true,
                    firmware: true
                },
            });

            if (!device) {
                console.log(`❌ Device not found: ${serialNumber}`);
                socket.disconnect();
                return;
            }

            console.log(`📱 Device found in database: ${serialNumber} - Owner: ${device.account_id} (${clientType})`);

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
                where: { serial_number: serialNumber },
                data: updateData,
            });

            // Create notification for device owner
            if (device.account_id) {
                await redisClient.setex(`device:${serialNumber}:account`, 3600, device.account_id);
                await notificationService.createNotification({
                    account_id: device.account_id,
                    text: `${clientType} ${serialNumber} is now online.`,
                    type: NotificationType.SYSTEM,
                });
            }

            socket.join(`device:${serialNumber}`);

            // Notify clients about device connection
            clientNamespace.emit('device_connect', {
                serialNumber,
                deviceType: clientType,
                timestamp: new Date().toISOString()
            });
            clientNamespace.emit('device_online', {
                serialNumber,
                deviceType: clientType,
                firmware_version,
                timestamp: new Date().toISOString()
            });

            console.log(`✅ ${clientType} connected successfully: ${serialNumber}`);

            // ============= SOCKET EVENT HANDLERS =============

            socket.on('device_online', (data) => {
                console.log(`📡 Device online event from ${serialNumber} (${clientType}):`, data);
                handleDeviceOnline(socket, clientNamespace, data, prisma);
            });

            socket.on('device_capabilities', (data) => {
                console.log(`⚙️  Device capabilities from ${serialNumber} (${clientType}):`, data);
                handleDeviceCapabilities(socket, clientNamespace, data, prisma);
            });
            socket.on('sensorData', async (data) => {
                console.log(`🌡️  Sensor data from ${serialNumber} (${clientType}):`, data);
                handleSensorData(socket, data, clientNamespace, prisma, alertService, notificationService, hourlyValueService);

                // === GỌI HÀM KIỂM TRA VÀ TRIGGER AUTOMATION ===
                try {
                    await AutomationService.checkAndTriggerAutomation({
                        serialNumber,
                        gas: data.gas,
                        temperature: data.temperature,
                        humidity: data.humidity,
                        smoke_level: data.smoke_level,
                        ...data
                    });
                } catch (err) {
                    console.error('Device link automation error:', err);
                }
            });

            // ESP8266 Fire Alarm specific events
            socket.on('alarm_trigger', async (data) => {
                console.log(`🚨 FIRE ALARM TRIGGERED from ${serialNumber} (${clientType}):`, data);

                // === GỌI HÀM KIỂM TRA VÀ TRIGGER AUTOMATION ===
                try {
                    await AutomationService.checkAndTriggerAutomation({
                        serialNumber,
                        gas: data.gas_level || data.smoke_level,
                        temperature: data.temperature,
                        ...data
                    });
                } catch (err) {
                    console.error('Device link automation error:', err);
                }

                // Broadcast emergency alert to all clients
                clientNamespace.emit('emergency_alert', {
                    serialNumber,
                    type: 'fire_alarm',
                    severity: 'critical',
                    data,
                    timestamp: new Date().toISOString()
                });

                // Also emit to device-specific room with correct alarmAlert format
                clientNamespace.to(`device:${serialNumber}`).emit('alarmAlert', {
                    serialNumber,
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
                console.log(`🔥 Fire detection from ${serialNumber} (${clientType}):`, data);

                clientNamespace.emit('fire_alert', {
                    ...data,
                    timestamp: new Date().toISOString()
                });
            });

            socket.on('smoke_detected', (data) => {
                console.log(`💨 Smoke detection from ${serialNumber} (${clientType}):`, data);

                clientNamespace.emit('smoke_alert', {
                    ...data,
                    timestamp: new Date().toISOString()
                });
            });

            // ESP8266 Status events
            socket.on('esp8266_status', (data) => {
                console.log(`📊 ESP8266 status from ${serialNumber}:`, data);

                clientNamespace.to(`device:${serialNumber}`).emit('esp8266_status', {
                    ...data,
                    timestamp: new Date().toISOString()
                });
            });

            // Existing device events (maintained for compatibility)
            socket.on('deviceStatus', (data) => {
                console.log(`📊 Device status from ${serialNumber} (${clientType}):`, data);
                clientNamespace.to(`device:${serialNumber}`).emit('deviceStatus', data);
            });

            socket.on('alarmAlert', (data) => {
                console.log(`🚨 Alarm alert from ${serialNumber} (${clientType}):`, data);
                clientNamespace.to(`device:${serialNumber}`).emit('alarmAlert', data);
            });

            // Command response from IoT device back to client
            socket.on('command_response', (responseData) => {
                console.log(`📥 Command response from device ${serialNumber} (${clientType}):`, responseData);
                clientNamespace.to(`device:${serialNumber}`).emit('command_response', {
                    ...responseData,
                    serialNumber,
                    timestamp: new Date().toISOString()
                });
            });

            // Command execution status
            socket.on('command_status', (statusData) => {
                console.log(`⚡ Command status from device ${serialNumber} (${clientType}):`, statusData);
                clientNamespace.to(`device:${serialNumber}`).emit('command_status', {
                    ...statusData,
                    serialNumber,
                    timestamp: new Date().toISOString()
                });
            });

            // ============= ESP8266 SPECIFIC PING/PONG =============
            socket.on('ping', () => {
                console.log(`🏓 Ping from ${clientType} ${serialNumber}`);
                socket.emit('pong', { timestamp: new Date().toISOString() });
            });

            // ESP8266 keep-alive (alternative to ping)
            socket.on('heartbeat', (data) => {
                console.log(`💓 Heartbeat from ${clientType} ${serialNumber}:`, data);
                socket.emit('heartbeat_ack', {
                    received: true,
                    timestamp: new Date().toISOString()
                });
            });

            // ============= ERROR HANDLING FOR ESP8266 =============
            socket.on('error', (error) => {
                console.error(`❌ Socket error from ${clientType} ${serialNumber}:`, error);
            });

            socket.on('connect_error', (error) => {
                console.error(`❌ Connection error from ${clientType} ${serialNumber}:`, error);
            });

            socket.on('disconnect', (reason) => {
                console.log(`🔌 ${clientType} ${serialNumber} disconnecting... Reason: ${reason}`);
                handleDeviceDisconnect(socket, clientNamespace, prisma, notificationService);
            });

        } catch (error) {
            console.error(`❌ ${clientType} socket error for ${serialNumber}:`, error);
            socket.disconnect();
        }
    });

    // Client App connections (Mobile/Web) - Namespace: /client
    clientNamespace.on('connection', async (socket: DeviceSocket) => {
        console.log(`📱 New CLIENT connection attempt to /client - Socket ID: ${socket.id}`);

        const { serialNumber, accountId } = socket.handshake.query as {
            serialNumber?: string;
            accountId?: string;
        };

        console.log(`📋 Client connection params - serialNumber: ${serialNumber}, accountId: ${accountId}`);

        if (!serialNumber|| !accountId) {
            console.log('❌ CLIENT connection rejected: Missing serialNumber or accountId');
            socket.disconnect();
            return;
        }

        socket.data = { serialNumber, accountId, isIoTDevice: false };

        try {
            // Validate device access
            const hasAccess = await validateDeviceAccess(serialNumber, accountId, prisma);
            if (!hasAccess) {
                console.log(`❌ Access denied for user ${accountId} to device ${serialNumber}`);
                socket.disconnect();
                return;
            }

            socket.join(`device:${serialNumber}`);
            console.log(`✅ CLIENT connected to device ${serialNumber} by user ${accountId}`);

            // Real-time device monitoring
            socket.on('start_real_time_device', ({ serialNumber: targetSerialNumber}) => {
                console.log(`🔴 Client requesting real-time for device: ${targetSerialNumber}`);
                if (targetSerialNumber=== serialNumber) {
                    socket.join(`device:${serialNumber}:realtime`);
                    console.log(`✅ Started real-time monitoring for device ${serialNumber} - Client in room: device:${serialNumber}:realtime`);

                    // Confirm to client
                    socket.emit('realtime_started', {
                        serialNumber,
                        status: 'started',
                        timestamp: new Date().toISOString()
                    });
                } else {
                    console.log(`❌ Device ID mismatch: requested=${targetSerialNumber}, connected=${serialNumber}`);
                }
            });

            socket.on('stop_real_time_device', ({ serialNumber: targetSerialNumber}) => {
                console.log(`🔵 Client stopping real-time for device: ${targetSerialNumber}`);
                if (targetSerialNumber=== serialNumber) {
                    socket.leave(`device:${serialNumber}:realtime`);
                    console.log(`✅ Stopped real-time monitoring for device ${serialNumber}`);

                    // Confirm to client
                    socket.emit('realtime_stopped', {
                        serialNumber,
                        status: 'stopped',
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // ============= COMMAND HANDLING FOR ESP8266 =============
            // Forward commands to IoT device (including ESP8266)
            socket.on('command', (commandData) => {
                console.log(`🎮 Generic command from client for device ${serialNumber}:`, commandData);

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
                deviceNamespace.to(`device:${serialNumber}`).emit('command', {
                    ...simplifiedCommand,
                    fromClient: accountId
                });

                // Send acknowledgment back to client
                socket.emit('command_sent', {
                    success: true,
                    serialNumber,
                    command: simplifiedCommand,
                    timestamp: new Date().toISOString()
                });

                console.log(`📤 Generic command forwarded to device ${serialNumber} (ESP8266 compatible):`, simplifiedCommand);
            });
            // ESP8266 specific: Reset alarm command
            socket.on('reset_alarm', (data) => {
                console.log(`🔄 Reset alarm command for device ${serialNumber}:`, data);

                deviceNamespace.to(`device:${serialNumber}`).emit('reset_alarm', {
                    serialNumber,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                });

                socket.emit('reset_alarm_sent', {
                    success: true,
                    serialNumber,
                    timestamp: new Date().toISOString()
                });
            });

            // ESP8266 specific: Test alarm command
            socket.on('test_alarm', (data) => {
                console.log(`🧪 Test alarm command for device ${serialNumber}:`, data);

                deviceNamespace.to(`device:${serialNumber}`).emit('test_alarm', {
                    serialNumber,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                });

                socket.emit('test_alarm_sent', {
                    success: true,
                    serialNumber,
                    timestamp: new Date().toISOString()
                });
            });

            // ESP8266 specific: Configuration update
            socket.on('update_config', (configData) => {
                console.log(`⚙️ Config update for ESP8266 device ${serialNumber}:`, configData);

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

                deviceNamespace.to(`device:${serialNumber}`).emit('update_config', {
                    config: configData,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                });

                socket.emit('config_update_sent', {
                    success: true,
                    serialNumber,
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
                console.log(`🌟 Set LED effect command for device ${serialNumber}:`, effectData);

                // Validate effect name
                const supportedEffects = [
                    'solid', 'blink', 'breathe', 'rainbow', 'chase',
                    'fade', 'strobe', 'sparkle', 'colorWave', 'rainbowMove',
                    'disco', 'meteor', 'pulse', 'twinkle', 'fireworks'
                ];

                if (!supportedEffects.includes(effectData.effect)) {
                    socket.emit('led_preset_error', {
                        serialNumber,
                        error: `Invalid preset: ${effectData.effect}`,
                        available_presets: supportedEffects,
                        timestamp: new Date().toISOString()
                    });
                    return;
                }

                // Validate and optimize parameters for ESP8266
                let speed = effectData.speed || 500;
                if (effectData.effect === 'disco' && speed > 200) {
                    speed = Math.max(80, speed / 4); // Auto-optimize disco speed
                    console.log(`⚡ Auto-optimized disco speed to ${speed}ms for ESP8266`);
                }

                const ledCommand = {
                    action: 'setEffect',
                    effect: effectData.effect,
                    speed: Math.max(50, Math.min(5000, speed)), // Clamp speed
                    count: Math.max(0, Math.min(100, effectData.count || 0)), // Clamp count
                    duration: Math.max(0, Math.min(300000, effectData.duration || 0)), // Max 5 minutes
                    color1: effectData.color1 || '#FF0000',
                    color2: effectData.color2 || '#0000FF',
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                };

                deviceNamespace.to(`device:${serialNumber}`).emit('command', ledCommand);

                socket.emit('led_effect_set', {
                    serialNumber,
                    effect: ledCommand.effect,
                    speed: ledCommand.speed,
                    count: ledCommand.count,
                    duration: ledCommand.duration,
                    color1: ledCommand.color1,
                    color2: ledCommand.color2,
                    timestamp: new Date().toISOString()
                });

                console.log(`📤 Enhanced LED effect command forwarded to device ${serialNumber}:`, ledCommand);
            });

            socket.on('applyPreset', (presetData: { preset: string; duration?: number }) => {
                console.log(`🎨 Apply LED preset command for device ${serialNumber}:`, presetData);

                // Validate preset name
                const supportedPresets = [
                    'party_mode', 'relaxation_mode', 'gaming_mode', 'alarm_mode',
                    'sleep_mode', 'wake_up_mode', 'focus_mode', 'movie_mode',
                    'romantic_mode', 'celebration_mode', 'rainbow_dance',
                    'ocean_wave', 'meteor_shower', 'christmas_mode', 'disco_fever'
                ];

                if (!supportedPresets.includes(presetData.preset)) {
                    socket.emit('led_preset_error', {
                        serialNumber,
                        error: `Invalid preset: ${presetData.preset}`,
                        available_presets: supportedPresets,
                        timestamp: new Date().toISOString()
                    });
                    return;
                }

                // ESP8266 optimization: Limit duration for memory-intensive presets
                let duration = presetData.duration || 0;
                const memoryIntensivePresets = ['disco_fever', 'meteor_shower', 'fireworks'];

                if (memoryIntensivePresets.includes(presetData.preset) && duration === 0) {
                    duration = 60000; // Auto-limit to 1 minute for continuous operation
                    console.log(`⚠️  Applied 1-minute limit to memory-intensive preset: ${presetData.preset}`);
                }

                const presetCommand = {
                    action: 'applyPreset',
                    preset: presetData.preset,
                    duration: Math.max(0, Math.min(300000, duration)), // Max 5 minutes
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                };

                deviceNamespace.to(`device:${serialNumber}`).emit('command', presetCommand);

                socket.emit('led_preset_applied', {
                    serialNumber,
                    preset: presetCommand.preset,
                    duration: presetCommand.duration,
                    timestamp: new Date().toISOString()
                });

                console.log(`📤 Enhanced LED preset '${presetData.preset}' command forwarded:`, presetCommand);
            });

            socket.on('updateLEDState', (stateData: {
                power_status?: boolean;
                color?: string;
                brightness?: number;
            }) => {
                console.log(`💡 Update LED state command for device ${serialNumber}:`, stateData);

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

                deviceNamespace.to(`device:${serialNumber}`).emit('command', stateCommand);

                socket.emit('led_state_updated', {
                    serialNumber,
                    state: stateCommand.state,
                    timestamp: new Date().toISOString()
                });

                console.log(`📤 LED state update forwarded to device ${serialNumber}:`, stateCommand);
            });

            socket.on('getLEDCapabilities', () => {
                console.log(`🔍 LED capabilities request for device ${serialNumber}`);

                const ledCapabilities = {
                    serialNumber,
                    supported_effects: [
                        'solid', 'blink', 'breathe', 'rainbow', 'chase',
                        'fade', 'strobe', 'sparkle', 'colorWave', 'rainbowMove',
                        'disco', 'meteor', 'pulse', 'twinkle', 'fireworks'
                    ],
                    supported_presets: [
                        'party_mode', 'relaxation_mode', 'gaming_mode', 'alarm_mode',
                        'sleep_mode', 'wake_up_mode', 'focus_mode', 'movie_mode',
                        'romantic_mode', 'celebration_mode', 'rainbow_dance',
                        'ocean_wave', 'meteor_shower', 'christmas_mode', 'disco_fever'
                    ],
                   preset_descriptions: {
                       'party_mode': 'Ánh sáng disco nhấp nháy nhanh và đầy năng lượng',
                       'relaxation_mode': 'Ánh sáng tím nhẹ nhàng, nhịp đập chậm',
                       'gaming_Mode': 'Sóng màu rực rỡ, năng động',
                       'alarm_mode': 'Đèn nháy màu đỏ dồn dập, mạnh mẽ cho tình huống khẩn cấp',
                       'sleep_mode': 'Ánh sáng ấm áp, nhẹ nhàng như hơi thở',
                       'wake_up_mode': 'Mô phỏng bình minh dịu nhẹ',
                       'focus_mode': 'Ánh sáng xanh da trời ổn định, tạo sự tập trung',
                       'movie_mode': 'Ánh xanh sâu, nhịp thở nhẹ nhàng tạo không gian',
                       'romantic_mode': 'Ánh hồng nhấp nháy nhẹ nhàng, thường xuyên tạo không gian lãng mạn',
                       'celebration_mode': 'Pháo hoa vàng rực rỡ, bùng nổ',
                       'rainbow_dance': 'Cầu vồng chuyển động rực rỡ, siêu nhanh',
                       'ocean_wave': 'Sóng biển xanh dịu dàng, chảy trôi',
                       'meteor_shower': 'Mưa sao băng trắng rơi nhanh, đầy kịch tính',
                       'christmas_mode': 'Sóng màu đỏ-xanh lá lễ hội, năng động',
                       'disco_fever': 'Đèn disco đa màu rực rỡ, siêu nhanh'
                   },
                    parameters: {
                       speed: {
                           min: 50,
                           max: 5000,
                           default: 500,
                           description: 'Tốc độ hiệu ứng tính bằng mili giây (giá trị thấp = nhanh hơn)'
                       },
                       brightness: {
                           min: 0,
                           max: 100,
                           default: 100,
                           description: 'Phần trăm độ sáng của đèn LED'
                       },
                       count: {
                           min: 0,
                           max: 100,
                           default: 0,
                           description: 'Số lần lặp lại (0 = vô hạn)'
                       },
                       duration: {
                           min: 0,
                           max: 60000,
                           default: 0,
                           description: 'Thời lượng hiệu ứng tính bằng mili giây (0 = vô hạn)'
                       }
                    },
                    color_palette: {
                        warm_colors: ['#FF8C69', '#FFE4B5', '#FFDAB9', '#F0E68C'],
                        cool_colors: ['#87CEEB', '#6A5ACD', '#4169E1', '#0077BE'],
                        vibrant_colors: ['#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#FFFF00', '#00FFFF'],
                        festive_colors: ['#FF0000', '#00FF00', '#FFD700', '#FF4500'],
                        romantic_colors: ['#FF69B4', '#FF1493', '#DC143C', '#B22222']
                    },
                recommended_combinations: [
                                {
                                    name: 'Sắc Hoàng Hôn',
                                    effect: 'colorWave',
                                    speed: 800,
                                    color1: '#FF8C69',
                                    color2: '#FF4500',
                                    brightness: 80
                                },
                                {
                                    name: 'Gió Biển',
                                    effect: 'pulse',
                                    speed: 3000,
                                    color1: '#0077BE',
                                    color2: '#40E0D0',
                                    brightness: 70
                                },
                                {
                                    name: 'Ánh Sáng Rừng',
                                    effect: 'twinkle',
                                    speed: 600,
                                    color1: '#228B22',
                                    color2: '#ADFF2F',
                                    brightness: 75
                                },
                                {
                                    name: 'Sao Thiên Hà',
                                    effect: 'meteor',
                                    speed: 300,
                                    color1: '#9370DB',
                                    color2: '#4B0082',
                                    brightness: 85
                                }
                            ],
                  performance_notes: {
                      disco: 'Sử dụng CPU cao - giảm tốc độ nếu ESP8266 trở nên không ổn định',
                      fireworks: 'Hoạt ảnh phức tạp - có thể cần điều chỉnh trên thiết bị chậm hơn',
                      meteor: 'Sử dụng nhiều bộ nhớ do tính toán vệt sáng',
                      colorWave: 'Hiệu suất mượt mà, phù hợp cho sử dụng liên tục',
                      rainbowMove: 'Tốc độ cập nhật cao - đảm bảo nguồn điện ổn định',
                      disco_fever: 'Hiệu ứng siêu nhanh - giới hạn thời lượng để tránh quá nhiệt'
                  },
                    timestamp: new Date().toISOString()
                };

                socket.emit('led_capabilities', ledCapabilities);
                console.log(`📤 Enhanced LED capabilities sent for device ${serialNumber}`);
            });




            socket.on('disconnect', () => {
                console.log(`📱 CLIENT disconnected from device ${serialNumber} (user: ${accountId})`);
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
