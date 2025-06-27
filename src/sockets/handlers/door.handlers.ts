import { Namespace, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { DoorState, DoorSocketEvents, DoorCommandData, DoorSensorData, DoorStatusResponse } from '../../types/door.types';
import { DoorService } from '../../services/door.service';
import AlertService from '../../services/alert.service';
import NotificationService from '../../services/notification.service';
import { NotificationType } from '../../types/notification';
import { Device } from '../../types/device';

const doorService = new DoorService();
const alertService = new AlertService();
const notificationService = new NotificationService();

export const handleDoorSensorData = async (
    socket: Socket,
    clientNamespace: Namespace,
    data: DoorSensorData,
    prisma: PrismaClient
) => {
    const { serialNumber } = data;

    try {
        await doorService.processDoorSensorData(data);

        clientNamespace.to(`door:${serialNumber}`).emit('door_sensor_data', {
            ...data,
            timestamp: new Date().toISOString()
        });

        if (data.door_state === DoorState.ERROR) {
            const prismaDevice = await prisma.devices.findFirst({
                where: { serial_number: serialNumber },
                include: { account: true }
            });

            if (prismaDevice?.account_id) {
                // Cast the Prisma device to Device interface with proper type casting for all fields
                const device: Device = {
                    device_id: prismaDevice.device_id,
                    serial_number: prismaDevice.serial_number,
                    template_id: prismaDevice.template_id,
                    space_id: prismaDevice.space_id,
                    account_id: prismaDevice.account_id,
                    group_id: prismaDevice.group_id,
                    hub_id: prismaDevice.hub_id,
                    firmware_id: prismaDevice.firmware_id,
                    name: prismaDevice.name,
                    power_status: prismaDevice.power_status,
                    attribute: prismaDevice.attribute as Record<string, any> | null,
                    wifi_ssid: prismaDevice.wifi_ssid,
                    wifi_password: prismaDevice.wifi_password,
                    current_value: prismaDevice.current_value as Record<string, any> | null,
                    link_status: prismaDevice.link_status,
                    last_reset_at: prismaDevice.last_reset_at,
                    lock_status: prismaDevice.lock_status,
                    locked_at: prismaDevice.locked_at,
                    created_at: prismaDevice.created_at,
                    updated_at: prismaDevice.updated_at,
                    is_deleted: prismaDevice.is_deleted,
                    device_type_id: null,
                    device_type_name: undefined,
                    device_template_name: undefined,
                    device_template_status: undefined,
                    device_base_capabilities: null,
                    capabilities: null
                };

                await alertService.createAlert(device, 3, 'Door error detected');
                await notificationService.createNotification({
                    account_id: prismaDevice.account_id,
                    text: `Error detected on door ${device.name || serialNumber}`,
                    type: NotificationType.ALERT
                });
            }
        }

    } catch (error) {
        console.error(`Door sensor data error for ${serialNumber}:`, error);
        socket.emit('error', {
            code: 'SENSOR_DATA_ERROR',
            message: 'Failed to process sensor data'
        });
    }
};

export const handleDoorStatus = async (
    socket: Socket,
    clientNamespace: Namespace,
    data: DoorStatusResponse,
    prisma: PrismaClient
) => {
    const { serialNumber } = data;

    try {
        clientNamespace.to(`door:${serialNumber}`).emit('door_status', {
            ...data,
            timestamp: new Date().toISOString()
        });

        console.log(`Door ${serialNumber} status updated:`, data);

    } catch (error) {
        console.error(`Door status update error for ${serialNumber}:`, error);
        socket.emit('error', {
            code: 'STATUS_UPDATE_ERROR',
            message: 'Failed to update door status'
        });
    }
};

export const handleDoorCommandResponse = async (
    socket: Socket,
    clientNamespace: Namespace,
    data: {
        serialNumber: string;
        command: string;
        success: boolean;
        result?: any;
        error?: string;
        timestamp: string;
    }
) => {
    const { serialNumber } = data;

    try {
        clientNamespace.to(`door:${serialNumber}`).emit('door_command_response', {
            ...data,
            timestamp: new Date().toISOString()
        });

        console.log(`Door ${serialNumber} command response:`, data);

    } catch (error) {
        console.error(`Door command response error for ${serialNumber}:`, error);
    }
};

export const handleDoorError = async (
    socket: Socket,
    clientNamespace: Namespace,
    data: {
        serialNumber: string;
        error: string;
        code: number;
        timestamp: string;
    },
    prisma: PrismaClient
) => {
    const { serialNumber } = data;

    try {
        const prismaDevice = await prisma.devices.findFirst({
            where: { serial_number: serialNumber },
            include: { account: true }
        });

        if (prismaDevice?.account_id) {
            // Cast the Prisma device to Device interface with proper type casting for all fields
            const device: Device = {
                device_id: prismaDevice.device_id,
                serial_number: prismaDevice.serial_number,
                template_id: prismaDevice.template_id,
                space_id: prismaDevice.space_id,
                account_id: prismaDevice.account_id,
                group_id: prismaDevice.group_id,
                hub_id: prismaDevice.hub_id,
                firmware_id: prismaDevice.firmware_id,
                name: prismaDevice.name,
                power_status: prismaDevice.power_status,
                attribute: prismaDevice.attribute as Record<string, any> | null,
                wifi_ssid: prismaDevice.wifi_ssid,
                wifi_password: prismaDevice.wifi_password,
                current_value: prismaDevice.current_value as Record<string, any> | null,
                link_status: prismaDevice.link_status,
                last_reset_at: prismaDevice.last_reset_at,
                lock_status: prismaDevice.lock_status,
                locked_at: prismaDevice.locked_at,
                created_at: prismaDevice.created_at,
                updated_at: prismaDevice.updated_at,
                is_deleted: prismaDevice.is_deleted,
                device_type_id: null,
                device_type_name: undefined,
                device_template_name: undefined,
                device_template_status: undefined,
                device_base_capabilities: null,
                capabilities: null
            };

            await alertService.createAlert(device, data.code, `Door error: ${data.error}`);
            await notificationService.createNotification({
                account_id: prismaDevice.account_id,
                text: `ERROR: ${device.name || serialNumber} - ${data.error}`,
                type: NotificationType.ALERT
            });

            clientNamespace.emit('door_error', {
                ...data,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error(`Door error handling error for ${serialNumber}:`, error);
    }
};

export const handleDoorEmergency = async (
    socket: Socket,
    clientNamespace: Namespace,
    data: {
        serialNumber: string;
        type: 'obstruction' | 'motor_failure' | 'sensor_failure';
        message: string;
    },
    prisma: PrismaClient
) => {
    const { serialNumber } = data;

    try {
        const prismaDevice = await prisma.devices.findFirst({
            where: { serial_number: serialNumber },
            include: { account: true }
        });

        if (prismaDevice?.account_id) {
            // Cast the Prisma device to Device interface with proper type casting for all fields
            const device: Device = {
                device_id: prismaDevice.device_id,
                serial_number: prismaDevice.serial_number,
                template_id: prismaDevice.template_id,
                space_id: prismaDevice.space_id,
                account_id: prismaDevice.account_id,
                group_id: prismaDevice.group_id,
                hub_id: prismaDevice.hub_id,
                firmware_id: prismaDevice.firmware_id,
                name: prismaDevice.name,
                power_status: prismaDevice.power_status,
                attribute: prismaDevice.attribute as Record<string, any> | null,
                wifi_ssid: prismaDevice.wifi_ssid,
                wifi_password: prismaDevice.wifi_password,
                current_value: prismaDevice.current_value as Record<string, any> | null,
                link_status: prismaDevice.link_status,
                last_reset_at: prismaDevice.last_reset_at,
                lock_status: prismaDevice.lock_status,
                locked_at: prismaDevice.locked_at,
                created_at: prismaDevice.created_at,
                updated_at: prismaDevice.updated_at,
                is_deleted: prismaDevice.is_deleted,
                device_type_id: null,
                device_type_name: undefined,
                device_template_name: undefined,
                device_template_status: undefined,
                device_base_capabilities: null,
                capabilities: null
            };

            await alertService.createAlert(device, 3, `Door emergency: ${data.type} - ${data.message}`);
            await notificationService.createNotification({
                account_id: prismaDevice.account_id,
                text: `EMERGENCY: ${device.name || serialNumber} - ${data.message}`,
                type: NotificationType.ALERT
            });

            clientNamespace.emit('door_emergency', {
                ...data,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error(`Door emergency handling error for ${serialNumber}:`, error);
    }
};

export const handleDoorCalibration = async (
    socket: Socket,
    clientNamespace: Namespace,
    data: {
        serialNumber: string;
        success: boolean;
        angles?: { open: number; close: number };
        error?: string;
    }
) => {
    const { serialNumber } = data;

    try {
        if (data.success && data.angles) {
            await doorService.updateDoorConfig(
                serialNumber,
                {
                    servo_open_angle: data.angles.open,
                    servo_close_angle: data.angles.close
                },
                'system'
            );
        }

        clientNamespace.to(`door:${serialNumber}`).emit('door_calibration_result', {
            ...data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`Door calibration handling error for ${serialNumber}:`, error);
    }
};

export const handleDoorTest = async (
    socket: Socket,
    clientNamespace: Namespace,
    data: {
        serialNumber: string;
        test_type: string;
        results: any;
        success: boolean;
        error?: string;
    }
) => {
    const { serialNumber } = data;

    try {
        clientNamespace.to(`door:${serialNumber}`).emit('door_test_result', {
            ...data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`Door test handling error for ${serialNumber}:`, error);
    }
};

export const handleDoorMaintenance = async (
    socket: Socket,
    clientNamespace: Namespace,
    data: {
        serialNumber: string;
        maintenance_type: string;
        details: any;
    },
    prisma: PrismaClient
) => {
    const { serialNumber } = data;

    try {
        const device = await prisma.devices.findFirst({
            where: { serial_number: serialNumber },
            include: { account: true }
        });

        if (device?.account_id) {
            await notificationService.createNotification({
                account_id: device.account_id,
                text: `Maintenance alert for ${device.name || serialNumber}: ${data.maintenance_type}`,
                type: NotificationType.SYSTEM
            });

            clientNamespace.to(`door:${serialNumber}`).emit('door_maintenance_alert', {
                ...data,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error(`Door maintenance handling error for ${serialNumber}:`, error);
    }
};

export const validateDoorAccess = async (
    serialNumber: string,
    accountId: string,
    prisma: PrismaClient
): Promise<boolean> => {
    try {
        const device = await prisma.devices.findFirst({
            where: { serial_number: serialNumber, is_deleted: false },
            include: {
                spaces: {
                    include: {
                        houses: true
                    }
                }
            }
        });

        if (!device) return false;

        if (device.account_id === accountId) return true;

        if (device.group_id) {
            const groupMember = await prisma.user_groups.findFirst({
                where: {
                    group_id: device.group_id,
                    account_id: accountId,
                    is_deleted: false
                }
            });
            if (groupMember) return true;
        }

        const sharedPermission = await prisma.shared_permissions.findFirst({
            where: {
                device_serial: serialNumber,
                shared_with_user_id: accountId,
                is_deleted: false
            }
        });

        return !!sharedPermission;

    } catch (error) {
        console.error('Door access validation error:', error);
        return false;
    }
};