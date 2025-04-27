// src/sockets/device!.socket.ts
import { Server, Socket, Namespace } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import redisClient from '../utils/redis';
import { DeviceSocket, ServerToClientEvents, ClientToServerEvents } from '../types/socket';
import { ErrorCodes, throwError } from '../utils/errors';
import admin from '../config/firebase';
import { sendEmergencyAlertEmail } from '../services/email.service';

const prisma = new PrismaClient();

const ALERT_TYPES = {
    GAS_HIGH: 1, // AlertTypeID=1: Gas alert
    TEMP_HIGH: 2, // AlertTypeID=2: Temperature alert
};

const ALERT_MESSAGES = {
    GAS_HIGH: 'KHẨN CẤP! Nồng độ khí quá cao!',
    TEMP_HIGH: 'KHẨN CẤP! Nhiệt độ quá cao!',
};

export const setupDeviceSocket = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    const deviceNamespace = io.of('/device');
    const clientNamespace = io.of('/client');

    // Device namespace (IoT devices)
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
            // Verify device exists
            const device = await prisma.devices.findUnique({
                where: { serial_number: deviceId, is_deleted: false },
                include: { account: true, spaces: true },
            });
            if (!device) {
                throwError(ErrorCodes.NOT_FOUND, 'Device not found');
            }

            // Update device status
            await prisma.devices.update({
                where: { serial_number: deviceId },
                data: { link_status: 'linked', updated_at: new Date() },
            });

            // Store device-to-account mapping in Redis
            if (device!.account_id) {
                await redisClient.set(`device:${deviceId}:account`, device!.account_id, { EX: 3600 });            }

            // Join device-specific room
            socket.join(`device:${deviceId}`);

            // Notify mobile clients
            clientNamespace.emit('device_connect', { deviceId });
            clientNamespace.emit('device_online', { deviceId });

            // Handle events
            socket.on('device_online', () => handleDeviceOnline(socket, clientNamespace));
            socket.on('sensorData', (data) => handleSensorData(socket, data, clientNamespace));
            socket.on('ping', () => { /* Keep connection alive */ });
            socket.on('disconnect', () => handleDeviceDisconnect(socket, clientNamespace));
        } catch (error) {
            console.error('Socket error:', error);
            socket.disconnect();
        }
    });

    // Client namespace (mobile apps)
    clientNamespace.on('connection',async (socket: DeviceSocket) => {
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
            // Verify user has access to device
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

            // Join device-specific room
            socket.join(`device:${deviceId}`);

            // Handle real-time data requests
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

    // Store sensor data
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

    // Log sensor data
    const device = await prisma.devices.findUnique({
        where: { serial_number: deviceId },
    });
    if (device) {
        await prisma.alerts.create({
            data: {
                device_serial: deviceId,
                space_id: device!.space_id,
                message: JSON.stringify(data),
                alert_type_id: data.type === 'smokeSensor' ? 1 : 0,
                status: 'unread',
            },
        });
    }

    // Check for alerts
    let alertCreated = false;
    if (typeof data.gas === 'number' && data.gas > 500) {
        const message = `${ALERT_MESSAGES.GAS_HIGH} (gas = ${data.gas})`;
        await createAlert(device!, ALERT_TYPES.GAS_HIGH, message);
        alertCreated = true;
    }
    if (typeof data.temperature === 'number' && data.temperature > 40) {
        const message = `${ALERT_MESSAGES.TEMP_HIGH} (temp = ${data.temperature}°C)`;
        await createAlert(device!, ALERT_TYPES.TEMP_HIGH, message);
        alertCreated = true;
    }

    if (alertCreated) {
        console.log(`Alert created for device ${deviceId}`);
    }

    // Emit to mobile clients
    clientNamespace.to(`device:${deviceId}`).emit('sensorData', { deviceId, ...data });
    clientNamespace.to(`device:${deviceId}`).emit('realtime_device_value', {
        serial: deviceId,
        data: { val: data },
    });
}

async function handleDeviceDisconnect(socket: DeviceSocket, clientNamespace: Namespace) {
    const { deviceId } = socket.data;

    // Update device status
    await prisma.devices.update({
        where: { serial_number: deviceId },
        data: { link_status: 'unlinked', power_status: false, updated_at: new Date() },
    });

    // Notify mobile clients
    clientNamespace.emit('device_disconnect', { deviceId });

    // Clean up Redis mapping
    await redisClient.del(`device:${deviceId}:account`);
}

async function createAlert(device: any, alertType: number, messageContent: string) {
    try {
        // Create alert in database
        const alert = await prisma.alerts.create({
            data: {
                device_serial: device!.serial_number,
                space_id: device!.space_id,
                message: messageContent,
                alert_type_id: alertType,
                status: 'unread',
            },
        });
        console.log(`*** ALERT: ${messageContent} for device ${device!.serial_number}`);

        // Find user
        const user = await prisma.account.findUnique({
            where: { account_id: device!.account_id },
            include: { customer: true },
        });

        if (user?.customer) {
            // Send FCM notification
            if (user.customer.email) {
                const message = {
                    token: user.customer.email, // Adjust based on actual FCM token field
                    notification: {
                        title: 'Cảnh báo từ thiết bị',
                        body: messageContent,
                    },
                    data: {
                        deviceId: device!.serial_number,
                        alertType: alertType.toString(),
                    },
                };

                await admin.messaging().send(message);
                console.log(`FCM sent to account ${user.account_id}`);
            }

            // Send email
            if (user.customer.email) {
                await sendEmergencyAlertEmail(user.customer.email, messageContent);
            }
        }
        return alert;
    } catch (error) {
        console.error(`Error creating alert for device ${device!.serial_number}:`, error);
        throw error;
    }
}