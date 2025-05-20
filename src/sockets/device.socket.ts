import { Server, Socket, Namespace } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import redisClient from '../utils/redis';
import { DeviceSocket, ServerToClientEvents, ClientToServerEvents } from '../types/socket';
import { ErrorCodes, throwError } from '../utils/errors';
import admin from '../config/firebase';
import AlertService from '../services/alert.service';
import NotificationService from '../services/notification.service';
import { NotificationType } from '../types/notification';

const prisma = new PrismaClient();
const alertService = new AlertService();
const notificationService = new NotificationService();

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

export const setupDeviceSocket = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    const deviceNamespace = io.of('/device');
    const clientNamespace = io.of('/client');

    deviceNamespace.on('connection', async (socket: DeviceSocket) => {
        const { deviceId, isIoTDevice = 'true' } = socket.handshake.query as {
            deviceId?: string;
            isIoTDevice?: string;
        };

        if (!deviceId) {
            socket.disconnect();
            return;
        }

        socket.data = { deviceId, isIoTDevice: isIoTDevice === 'true' };

        try {
            const device = await prisma.devices.findUnique({
                where: { serial_number: deviceId, is_deleted: false },
                include: { account: true, spaces: true },
            });
            if (!device) {
                throwError(ErrorCodes.NOT_FOUND, 'Device not found');
            }

            await prisma.devices.update({
                where: { serial_number: deviceId },
                data: { link_status: 'linked', updated_at: new Date() },
            });

            if (device!.account_id) {
                await redisClient.set(`device:${deviceId}:account`, device!.account_id, { EX: 3600 });
                await notificationService.createNotification({
                    account_id: device!.account_id,
                    text: `Device ${deviceId} is now online.`,
                    type: NotificationType.SYSTEM,
                });
            }

            socket.join(`device:${deviceId}`);

            clientNamespace.emit('device_connect', { deviceId });
            clientNamespace.emit('device_online', { deviceId });

            socket.on('device_online', () => handleDeviceOnline(socket, clientNamespace));
            socket.on('sensorData', (data) => handleSensorData(socket, data, clientNamespace));
            socket.on('ping', () => {});
            socket.on('disconnect', () => handleDeviceDisconnect(socket, clientNamespace));
        } catch (error) {
            console.error('Socket error:', error);
            socket.disconnect();
        }
    });

    clientNamespace.on('connection', async (socket: DeviceSocket) => {
        const { deviceId, accountId } = socket.handshake.query as {
            deviceId?: string;
            accountId?: string;
        };

        if (!deviceId || !accountId) {
            socket.disconnect();
            return;
        }

        socket.data = { deviceId, accountId, isIoTDevice: false };

        try {
            const device = await prisma.devices.findUnique({
                where: { serial_number: deviceId, is_deleted: false },
                include: { account: true, spaces: { include: { houses: true } } },
            });
            if (!device) {
                throwError(ErrorCodes.NOT_FOUND, 'Device not found');
            }

            const hasAccess =
                device!.account_id === accountId ||
                (await prisma.user_groups.findFirst({
                    where: {
                        group_id: device!.spaces?.houses?.group_id,
                        account_id: accountId,
                        is_deleted: false,
                    },
                })) ||
                (await prisma.shared_permissions.findFirst({
                    where: {
                        device_serial: deviceId,
                        shared_with_user_id: accountId,
                        is_deleted: false,
                    },
                }));

            if (!hasAccess) {
                throwError(ErrorCodes.FORBIDDEN, 'No permission to access this device');
            }

            socket.join(`device:${deviceId}`);

            socket.on('start_real_time_device', ({ deviceId: targetDeviceId }) => {
                if (targetDeviceId === deviceId) {
                    socket.join(`device:${deviceId}`);
                }
            });

            socket.on('stop_real_time_device', ({ deviceId: targetDeviceId }) => {
                if (targetDeviceId === deviceId) {
                    socket.leave(`device:${deviceId}`);
                }
            });

            socket.on('disconnect', () => {
                console.log(`Mobile client ${socket.id} disconnected`);
            });
        } catch (error) {
            console.error('Client socket error:', error);
            socket.disconnect();
        }
    });
};

async function handleDeviceOnline(socket: DeviceSocket, clientNamespace: Namespace) {
    const { deviceId } = socket.data;
    await prisma.devices.update({
        where: { serial_number: deviceId },
        data: { link_status: 'linked', updated_at: new Date() },
    });
    clientNamespace.emit('device_online', { deviceId });
}

async function handleSensorData(
    socket: DeviceSocket,
    data: { gas?: number; temperature?: number; humidity?: number; type?: string },
    clientNamespace: Namespace
) {
    const { deviceId } = socket.data;

    await prisma.devices.update({
        where: { serial_number: deviceId },
        data: {
            current_value: {
                gas: data.gas,
                temperature: data.temperature,
                humidity: data.humidity,
            },
            updated_at: new Date(),
        },
    });

    const device = await prisma.devices.findUnique({
        where: { serial_number: deviceId },
        include: { account: true },
    });
    if (device) {
        await prisma.alerts.create({
            data: {
                device_serial: deviceId,
                space_id: device.space_id,
                message: JSON.stringify(data),
                alert_type_id: data.type === 'smokeSensor' ? 1 : 0,
                status: 'unread',
            },
        });

        if (device.account_id) {
            await notificationService.createNotification({
                account_id: device.account_id,
                text: `New sensor data received from device ${deviceId}: ${JSON.stringify(data)}`,
                type: NotificationType.ALERT,
            });
        }
    }

    let alertCreated = false;
    if (typeof data.gas === 'number' && data.gas > 500) {
        const message = `${ALERT_MESSAGES.GAS_HIGH} (gas = ${data.gas})`;
        if (device) {
            await alertService.createAlert(
                // @ts-ignore
                device, ALERT_TYPES.GAS_HIGH, message);
            await notificationService.createNotification({
                // @ts-ignore
                account_id: device.account_id,
                text: message,
                type: NotificationType.ALERT,
            });
            alertCreated = true;
        }
    }
    if (typeof data.temperature === 'number' && data.temperature > 40) {
        const message = `${ALERT_MESSAGES.TEMP_HIGH} (temp = ${data.temperature}°C)`;
        if (device) {
            await alertService.createAlert(
                // @ts-ignore
                device, ALERT_TYPES.TEMP_HIGH, message);
            await notificationService.createNotification({
                // @ts-ignore
                account_id: device.account_id,
                text: message,
                type: NotificationType.ALERT,
            });
            alertCreated = true;
        }
    }

    if (alertCreated) {
        console.log(`Alert and notification created for device ${deviceId}`);
    }

    clientNamespace.to(`device:${deviceId}`).emit('sensorData', {
        deviceId,
        ...data,
    });
    clientNamespace.to(`device:${deviceId}`).emit('realtime_device_value', {
        serial: deviceId,
        data: { val: data },
    });
}

async function handleDeviceDisconnect(socket: DeviceSocket, clientNamespace: Namespace) {
    const { deviceId } = socket.data;

    await prisma.devices.update({
        where: { serial_number: deviceId },
        data: { link_status: 'unlinked', power_status: false, updated_at: new Date() },
    });

    const device = await prisma.devices.findUnique({
        where: { serial_number: deviceId },
        include: { account: true },
    });

    if (device?.account_id) {
        await alertService.createAlert(
            // @ts-ignore
            device, ALERT_TYPES.DEVICE_DISCONNECT, ALERT_MESSAGES.DEVICE_DISCONNECT);
        await notificationService.createNotification({
            account_id: device.account_id,
            text: `Device ${deviceId} has been disconnected.`,
            type: NotificationType.SECURITY,
        });
    }

    clientNamespace.emit('device_disconnect', { deviceId });

    await redisClient.del(`device:${deviceId}:account`);
}