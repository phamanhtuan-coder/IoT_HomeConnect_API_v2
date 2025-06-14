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
 */
export const handleDeviceOnline = async (
    socket: DeviceSocket,
    clientNamespace: Namespace,
    data: any,
    prisma: PrismaClient
) => {
    const { deviceId } = socket.data;

    try {
        const updateData: any = {
            link_status: 'linked',
            updated_at: new Date()
        };

        // Update runtime capabilities if provided
        if (data?.capabilities) {
            updateData.runtime_capabilities = data.capabilities;
            console.log(`Updated capabilities for device ${deviceId}:`, data.capabilities);
        }

        await prisma.devices.update({
            where: { serial_number: deviceId },
            data: updateData,
        });

        // Broadcast device online with capabilities to all clients
        clientNamespace.emit('device_online', {
            deviceId,
            capabilities: data?.capabilities,
            timestamp: new Date().toISOString()
        });

        console.log(`Device ${deviceId} is online with capabilities`);

    } catch (error) {
        console.error(`Error handling device online for ${deviceId}:`, error);
    }
};

/**
 * Handle device capabilities update (separate event)
 */
export const handleDeviceCapabilities = async (
    socket: DeviceSocket,
    clientNamespace: Namespace,
    data: any,
    prisma: PrismaClient
) => {
    const { deviceId } = socket.data;

    try {
        await prisma.devices.update({
            where: { serial_number: deviceId },
            data: {
                runtime_capabilities: data,
                updated_at: new Date()
            },
        });

        // Broadcast capabilities update to clients
        clientNamespace.to(`device:${deviceId}`).emit('capabilities_updated', {
            deviceId,
            capabilities: data,
            timestamp: new Date().toISOString()
        });

        console.log(`Capabilities updated for device ${deviceId}:`, data);

    } catch (error) {
        console.error(`Error updating capabilities for ${deviceId}:`, error);
    }
};

/**
 * Handle sensor data from IoT devices
 */
export const handleSensorData = async (
    socket: DeviceSocket,
    data: { gas?: number; temperature?: number; humidity?: number; type?: string },
    clientNamespace: Namespace,
    prisma: PrismaClient,
    alertService: AlertService,
    notificationService: NotificationService,
    hourlyValueService: HourlyValueService
) => {
    const { deviceId } = socket.data;

    try {
        // Process hourly values for analytics
        if (data.gas !== undefined || data.temperature !== undefined || data.humidity !== undefined) {
            await hourlyValueService.processSensorData(deviceId, {
                gas: data.gas,
                temperature: data.temperature,
                humidity: data.humidity
            });
        }

        // Check alert conditions
        let alertTriggered = false;
        let alertType: number | null = null;
        let alertMessage = '';

        if (data.gas && data.gas > ALERT_THRESHOLDS.GAS_HIGH) {
            alertTriggered = true;
            alertType = ALERT_TYPES.GAS_HIGH;
            alertMessage = 'KHẨN CẤP! Nồng độ khí quá cao!';
        }

        if (data.temperature && data.temperature > ALERT_THRESHOLDS.TEMP_HIGH) {
            alertTriggered = true;
            alertType = ALERT_TYPES.TEMP_HIGH;
            alertMessage = 'KHẨN CẤP! Nhiệt độ quá cao!';
        }

        // Create alert if conditions met
        if (alertTriggered && alertType) {
            const device = await prisma.devices.findUnique({
                where: { serial_number: deviceId },
                include: { account: true }
            });

            if (device?.account_id) {
                // Create alert in database - AlertService expects (device, alertTypeId, message)
                const deviceForAlert = {
                    serial_number: device.serial_number,
                    space_id: device.space_id,
                    account_id: device.account_id
                };

                await alertService.createAlert(
                    deviceForAlert as any, // Cast to match Device interface
                    alertType, // alert_type_id
                    alertMessage // message
                );

                // Send push notification
                await notificationService.createNotification({
                    account_id: device.account_id,
                    text: alertMessage,
                    type: NotificationType.ALERT,
                });

                // Broadcast alert to all clients monitoring this device
                clientNamespace.emit('device_alert', {
                    deviceId,
                    alertType,
                    message: alertMessage,
                    sensorData: data,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Broadcast sensor data to clients monitoring this device
        clientNamespace.to(`device:${deviceId}`).emit('sensorData', {
            deviceId,
            ...data,
            timestamp: new Date().toISOString()
        });

        // Broadcast to real-time monitoring clients
        clientNamespace.to(`device:${deviceId}:realtime`).emit('realtime_device_value', {
            serial: deviceId,
            data: { val: data }
        });

        console.log(`Sensor data processed for device ${deviceId}:`, data);

    } catch (error) {
        console.error(`Error handling sensor data for ${deviceId}:`, error);
    }
};

/**
 * Handle device disconnect
 */
export const handleDeviceDisconnect = async (
    socket: DeviceSocket,
    clientNamespace: Namespace,
    prisma: PrismaClient,
    notificationService: NotificationService
) => {
    const { deviceId } = socket.data;

    try {
        // Update device status
        await prisma.devices.update({
            where: { serial_number: deviceId },
            data: {
                link_status: 'unlinked',
                updated_at: new Date()
            },
        });

        // Get device info for notification
        const device = await prisma.devices.findUnique({
            where: { serial_number: deviceId },
            include: { account: true }
        });

        if (device?.account_id) {
            // Create disconnect notification
            await notificationService.createNotification({
                account_id: device.account_id,
                text: `Device ${deviceId} has been disconnected.`,
                type: NotificationType.SYSTEM,
            });
        }

        // Broadcast disconnect to clients
        clientNamespace.emit('device_disconnect', {
            deviceId,
            timestamp: new Date().toISOString()
        });

        console.log(`Device ${deviceId} disconnected`);

    } catch (error) {
        console.error(`Error handling device disconnect for ${deviceId}:`, error);
    }
};

/**
 * Validate if user has access to device
 */
export const validateDeviceAccess = async (
    deviceId: string,
    accountId: string,
    prisma: PrismaClient
): Promise<boolean> => {
    try {
        const device = await prisma.devices.findUnique({
            where: { serial_number: deviceId, is_deleted: false },
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
                device_serial: deviceId,
                shared_with_user_id: accountId,
                is_deleted: false,
            },
        });

        return !!sharedPermission;

    } catch (error) {
        console.error('Error validating device access:', error);
        return false;
    }
};