// src/sockets/device.socket.ts
import { Server, Socket, Namespace } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import redisClient from '../utils/redis';
import { DeviceSocket, ServerToClientEvents, ClientToServerEvents } from '../types/socket';
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

export const setupDeviceSocket = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    const deviceNamespace = io.of('/device');
    const clientNamespace = io.of('/client');

    // IoT Device connections
    deviceNamespace.on('connection', async (socket: DeviceSocket) => {
        const { deviceId, isIoTDevice = 'true' } = socket.handshake.query as {
            deviceId?: string;
            isIoTDevice?: string;
        };

        if (!deviceId) {
            console.log('Device connection rejected: Missing deviceId');
            socket.disconnect();
            return;
        }

        socket.data = { deviceId, isIoTDevice: isIoTDevice === 'true' };

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
                console.log(`Device not found: ${deviceId}`);
                socket.disconnect();
                return;
            }

            // Update device link status
            await prisma.devices.update({
                where: { serial_number: deviceId },
                data: { link_status: 'linked', updated_at: new Date() },
            });

            // Create notification for device owner
            if (device.account_id) {
                await redisClient.setex(`device:${deviceId}:account`, 3600, device.account_id);
                await notificationService.createNotification({
                    account_id: device.account_id,
                    text: `Device ${deviceId} is now online.`,
                    type: NotificationType.SYSTEM,
                });
            }

            socket.join(`device:${deviceId}`);

            // Notify clients about device connection
            clientNamespace.emit('device_connect', { deviceId });
            clientNamespace.emit('device_online', { deviceId, timestamp: new Date().toISOString() });

            console.log(`IoT Device connected: ${deviceId}`);

            // Socket event handlers
            socket.on('device_online', (data) =>
                handleDeviceOnline(socket, clientNamespace, data, prisma)
            );

            socket.on('device_capabilities', (data) =>
                handleDeviceCapabilities(socket, clientNamespace, data, prisma)
            );

            socket.on('sensorData', (data) =>
                handleSensorData(socket, data, clientNamespace, prisma, alertService, notificationService, hourlyValueService)
            );

            socket.on('deviceStatus', (data) => {
                console.log(`Device status from ${deviceId}:`, data);
                clientNamespace.to(`device:${deviceId}`).emit('deviceStatus', data);
            });

            socket.on('alarmAlert', (data) => {
                console.log(`Alarm alert from ${deviceId}:`, data);
                clientNamespace.to(`device:${deviceId}`).emit('alarmAlert', data);
            });

            socket.on('ping', () => {
                // Keep connection alive
                socket.emit('pong');
            });

            socket.on('disconnect', () =>
                handleDeviceDisconnect(socket, clientNamespace, prisma, notificationService)
            );

        } catch (error) {
            console.error('IoT Device socket error:', error);
            socket.disconnect();
        }
    });

    // Client App connections (Mobile/Web)
    clientNamespace.on('connection', async (socket: DeviceSocket) => {
        const { deviceId, accountId } = socket.handshake.query as {
            deviceId?: string;
            accountId?: string;
        };

        if (!deviceId || !accountId) {
            console.log('Client connection rejected: Missing deviceId or accountId');
            socket.disconnect();
            return;
        }

        socket.data = { deviceId, accountId, isIoTDevice: false };

        try {
            // Validate device access
            const hasAccess = await validateDeviceAccess(deviceId, accountId, prisma);
            if (!hasAccess) {
                console.log(`Access denied for user ${accountId} to device ${deviceId}`);
                socket.disconnect();
                return;
            }

            socket.join(`device:${deviceId}`);
            console.log(`Client connected to device ${deviceId} by user ${accountId}`);

            // Real-time device monitoring
            socket.on('start_real_time_device', ({ deviceId: targetDeviceId }) => {
                if (targetDeviceId === deviceId) {
                    socket.join(`device:${deviceId}:realtime`);
                    console.log(`Started real-time monitoring for device ${deviceId}`);
                }
            });

            socket.on('stop_real_time_device', ({ deviceId: targetDeviceId }) => {
                if (targetDeviceId === deviceId) {
                    socket.leave(`device:${deviceId}:realtime`);
                    console.log(`Stopped real-time monitoring for device ${deviceId}`);
                }
            });

            socket.on('disconnect', () => {
                console.log(`Client disconnected from device ${deviceId}`);
            });

        } catch (error) {
            console.error('Client socket error:', error);
            socket.disconnect();
        }
    });
};

export { ALERT_TYPES, ALERT_MESSAGES };