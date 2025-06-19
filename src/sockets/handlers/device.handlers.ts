// src/sockets/handlers/device.handlers.ts
import { Namespace, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { DeviceSocket } from '../../types/socket';
import AlertService from '../../services/alert.service';
import NotificationService from '../../services/notification.service';
import HourlyValueService from '../../services/hourly-value.service';
import { NotificationType } from '../../types/notification';

const ALERT_THRESHOLDS = {
    GAS_HIGH: 600,
    TEMP_HIGH: 40.0,
};

const ALERT_TYPES = {
    GAS_HIGH: 1,
    TEMP_HIGH: 2,
    DEVICE_DISCONNECT: 3,
};

/**
 * Handle device online event with capabilities update
 * Enhanced for ESP8266 compatibility
 */
export const handleDeviceOnline = async (
    socket: DeviceSocket,
    clientNamespace: Namespace,
    data: any,
    prisma: PrismaClient
) => {
    const { serialNumber } = socket.data;

    try {
        const updateData: any = {
            link_status: 'linked',
            updated_at: new Date()
        };

        // Update runtime capabilities if provided
        if (data?.capabilities) {
            updateData.runtime_capabilities = data.capabilities;
            console.log(`🔧 Updated capabilities for device ${serialNumber}:`, data.capabilities);
        }

        // ESP8266 specific: Handle firmware version if provided
        if (data?.firmware_version) {
            updateData.firmware_version = data.firmware_version;
            console.log(`📡 ESP8266 firmware version ${serialNumber}: ${data.firmware_version}`);
        }

        // ESP8266 specific: Handle hardware info
        if (data?.hardware_info) {
            updateData.hardware_info = data.hardware_info;
            console.log(`🔌 ESP8266 hardware info ${serialNumber}:`, data.hardware_info);
        }

        await prisma.devices.update({
            where: { serial_number: serialNumber },
            data: updateData,
        });

        // Broadcast device online with capabilities to all clients
        clientNamespace.emit('device_online', {
            serialNumber,
            capabilities: data?.capabilities,
            firmware_version: data?.firmware_version,
            hardware_info: data?.hardware_info,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Device ${serialNumber} is online with capabilities (ESP8266 compatible)`);

    } catch (error) {
        console.error(`❌ Error handling device online for ${serialNumber}:`, error);

        // ESP8266 specific: Send simple error response for memory-constrained devices
        try {
            socket.emit('error', {
                code: 'ONLINE_ERROR',
                message: 'Failed to update device status'
            });
        } catch (emitError) {
            console.error(`Failed to send error to ESP8266 device ${serialNumber}:`, emitError);
        }
    }
};

/**
 * Handle device capabilities update (separate event)
 * Optimized for ESP8266 memory constraints
 */
export const handleDeviceCapabilities = async (
    socket: DeviceSocket,
    clientNamespace: Namespace,
    data: any,
    prisma: PrismaClient
) => {
    const { serialNumber } = socket.data;

    try {
        // ESP8266 optimization: Validate data size before processing
        const dataSize = JSON.stringify(data).length;
        if (dataSize > 10000) { // 10KB limit for ESP8266
            console.warn(`⚠️  Large capabilities data from ESP8266 ${serialNumber}: ${dataSize} bytes`);
        }

        await prisma.devices.update({
            where: { serial_number: serialNumber },
            data: {
                runtime_capabilities: data,
                updated_at: new Date()
            },
        });

        // Broadcast capabilities update to clients
        clientNamespace.to(`device:${serialNumber}`).emit('capabilities_updated', {
            serialNumber,
            capabilities: data,
            timestamp: new Date().toISOString()
        });

        // ESP8266 specific: Send acknowledgment to confirm receipt
        socket.emit('capabilities_ack', {
            status: 'success',
            timestamp: new Date().toISOString()
        });

        console.log(`🔧 Capabilities updated for device ${serialNumber} (ESP8266 compatible)`);

    } catch (error) {
        console.error(`❌ Error updating capabilities for ${serialNumber}:`, error);

        // ESP8266 specific: Send error acknowledgment
        socket.emit('capabilities_ack', {
            status: 'error',
            message: 'Failed to update capabilities',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Handle sensor data from IoT devices
 * Enhanced for ESP8266 fire alarm systems
 */
export const handleSensorData = async (
    socket: DeviceSocket,
    data: {
        gas?: number;
        temperature?: number;
        humidity?: number;
        smoke_level?: number;  // ESP8266 fire alarm specific
        flame_detected?: boolean;  // ESP8266 fire alarm specific
        type?: string;
        battery_level?: number;  // ESP8266 specific
        rssi?: number;  // ESP8266 WiFi signal strength
    },
    clientNamespace: Namespace,
    prisma: PrismaClient,
    alertService: AlertService,
    notificationService: NotificationService,
    hourlyValueService: HourlyValueService
) => {
    const { serialNumber } = socket.data;

    try {
        // ESP8266 optimization: Process data efficiently
        const sensorData = {
            gas: data.gas,
            temperature: data.temperature,
            humidity: data.humidity,
            smoke_level: data.smoke_level,
            flame_detected: data.flame_detected,
            battery_level: data.battery_level,
            rssi: data.rssi
        };

        // Process hourly values for analytics (only if values exist)
        const hasAnalyticsData = data.gas !== undefined ||
            data.temperature !== undefined ||
            data.humidity !== undefined;

        if (hasAnalyticsData) {
            await hourlyValueService.processSensorData(serialNumber, {
                gas: data.gas,
                temperature: data.temperature,
                humidity: data.humidity
            });
        }

        // Enhanced alert checking for ESP8266 fire alarm systems
        let alertTriggered = false;
        let alertType: number | null = null;
        let alertMessage = '';

        // Gas level alert
        if (data.gas && data.gas > ALERT_THRESHOLDS.GAS_HIGH) {
            alertTriggered = true;
            alertType = ALERT_TYPES.GAS_HIGH;
            alertMessage = 'KHẨN CẤP! Nồng độ khí quá cao!';
        }

        // Temperature alert
        if (data.temperature && data.temperature > ALERT_THRESHOLDS.TEMP_HIGH) {
            alertTriggered = true;
            alertType = ALERT_TYPES.TEMP_HIGH;
            alertMessage = 'KHẨN CẤP! Nhiệt độ quá cao!';
        }

        // ESP8266 fire alarm specific alerts
        if (data.smoke_level && data.smoke_level > 500) { // Configurable threshold
            alertTriggered = true;
            alertType = ALERT_TYPES.GAS_HIGH; // Reuse gas alert type for smoke
            alertMessage = 'KHẨN CẤP! Phát hiện khói!';
        }

        if (data.flame_detected === true) {
            alertTriggered = true;
            alertType = ALERT_TYPES.TEMP_HIGH; // Reuse temp alert type for flame
            alertMessage = 'KHẨN CẤP! Phát hiện lửa!';
        }

        // ESP8266 specific: Low battery warning
        if (data.battery_level && data.battery_level < 20) {
            console.warn(`🔋 Low battery warning for ESP8266 ${serialNumber}: ${data.battery_level}%`);
            // Create low battery notification (non-critical)
        }

        // Create alert if conditions met
        if (alertTriggered && alertType) {
            const device = await prisma.devices.findUnique({
                where: { serial_number: serialNumber },
                include: { account: true }
            });

            if (device?.account_id) {
                // Create alert in database
                const deviceForAlert = {
                    serial_number: device.serial_number,
                    space_id: device.space_id,
                    account_id: device.account_id
                };

                await alertService.createAlert(
                    deviceForAlert as any,
                    alertType,
                    alertMessage
                );

                // Send push notification
                await notificationService.createNotification({
                    account_id: device.account_id,
                    text: alertMessage,
                    type: NotificationType.ALERT,
                });

                // Broadcast alert to all clients monitoring this device
                clientNamespace.emit('device_alert', {
                    serialNumber,
                    alertType,
                    message: alertMessage,
                    sensorData: data,
                    timestamp: new Date().toISOString()
                });

                console.log(`🚨 ALERT triggered for ESP8266 device ${serialNumber}: ${alertMessage}`);
            }
        }

        // Broadcast sensor data to clients monitoring this device
        clientNamespace.to(`device:${serialNumber}`).emit('sensorData', {
            serialNumber,
            ...sensorData,
            timestamp: new Date().toISOString()
        });

        // Broadcast to real-time monitoring clients
        clientNamespace.to(`device:${serialNumber}:realtime`).emit('realtime_device_value', {
            serial: serialNumber,
            data: { val: sensorData }
        });

        // ESP8266 specific: Send acknowledgment to confirm data receipt
        socket.emit('sensor_ack', {
            status: 'received',
            timestamp: new Date().toISOString()
        });

        console.log(`📊 Sensor data processed for ESP8266 device ${serialNumber}`);

    } catch (error) {
        console.error(`❌ Error handling sensor data for ${serialNumber}:`, error);

        // ESP8266 specific: Send error acknowledgment
        try {
            socket.emit('sensor_ack', {
                status: 'error',
                message: 'Failed to process sensor data',
                timestamp: new Date().toISOString()
            });
        } catch (emitError) {
            console.error(`Failed to send sensor_ack to ESP8266 ${serialNumber}:`, emitError);
        }
    }
};

/**
 * Handle device disconnect
 * Enhanced for ESP8266 connection management
 */
export const handleDeviceDisconnect = async (
    socket: DeviceSocket,
    clientNamespace: Namespace,
    prisma: PrismaClient,
    notificationService: NotificationService
) => {
    const { serialNumber } = socket.data;

    try {
        // Update device status
        await prisma.devices.update({
            where: { serial_number: serialNumber },
            data: {
                link_status: 'unlinked',
                updated_at: new Date()
            },
        });

        // Get device info for notification
        const device = await prisma.devices.findFirst({
            where: { serial_number: serialNumber },
            include: { account: true }
        });

        if (device?.account_id) {
            // Create disconnect notification
            await notificationService.createNotification({
                account_id: device.account_id,
                text: `Device ${serialNumber} has been disconnected.`,
                type: NotificationType.SYSTEM,
            });
        }

        // Broadcast disconnect to clients
        clientNamespace.emit('device_disconnect', {
            serialNumber,
            timestamp: new Date().toISOString()
        });

        console.log(`🔌 ESP8266 device ${serialNumber} disconnected`);

    } catch (error) {
        console.error(`❌ Error handling ESP8266 disconnect for ${serialNumber}:`, error);
    }
};

/**
 * Validate if user has access to device
 * Same logic maintained for compatibility
 */
export const validateDeviceAccess = async (
    serialNumber: string,
    accountId: string,
    prisma: PrismaClient
): Promise<boolean> => {
    try {
        const device = await prisma.devices.findFirst({
            where: { serial_number: serialNumber, is_deleted: false },
            include: {
                account: true,
                spaces: {
                    include: {
                        houses: true
                    }
                }
            },
        });

        if (!device) return false;

        // Check if user is device owner
        if (device.account_id === accountId) return true;

        // Check if user is in the same group/house
        if (device.spaces?.houses?.group_id) {
            const groupMember = await prisma.user_groups.findFirst({
                where: {
                    group_id: device.spaces.houses.group_id,
                    account_id: accountId,
                    is_deleted: false,
                },
            });
            if (groupMember) return true;
        }

        // Check shared permissions
        const sharedPermission = await prisma.shared_permissions.findFirst({
            where: {
                device_serial: serialNumber,
                shared_with_user_id: accountId,
                is_deleted: false,
            },
        });

        return !!sharedPermission;

    } catch (error) {
        console.error('❌ Error validating device access:', error);
        return false;
    }
};

