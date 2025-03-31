import { PrismaClient } from '@prisma/client';
import { throwError, ErrorCodes } from '../utils/errors';

export class UserDeviceService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async upsertDevice(userId: number, deviceName: string, deviceId: string, deviceType: string, fcmToken?: string) {
        if (!deviceId) throwError(ErrorCodes.BAD_REQUEST, 'Device ID is required');

        const deviceCount = await this.prisma.user_devices.count({
            where: { UserID: userId, IsDeleted: false },
        });
        if (deviceCount >= 5) {
            throwError(ErrorCodes.FORBIDDEN, 'Maximum device limit reached. Please revoke an existing device.');
        }

        const existingByFingerprint = fcmToken
            ? await this.prisma.user_devices.findFirst({
                where: { UserID: userId, DeviceName: deviceName, FCMToken: fcmToken, IsDeleted: false },
            })
            : null;

        if (existingByFingerprint && existingByFingerprint.DeviceID !== deviceId) {
            return this.prisma.user_devices.update({
                where: { UserDeviceID: existingByFingerprint.UserDeviceID },
                data: {
                    DeviceID: deviceId,
                    DeviceType: deviceType,
                    FCMToken: fcmToken || existingByFingerprint.FCMToken,
                    LastLogin: new Date(),
                    UpdatedAt: new Date(),
                },
            });
        }

        const existingByDeviceId = await this.prisma.user_devices.findFirst({
            where: { UserID: userId, DeviceID: deviceId, IsDeleted: false },
        });

        if (existingByDeviceId) {
            return this.prisma.user_devices.update({
                where: { UserDeviceID: existingByDeviceId.UserDeviceID },
                data: {
                    DeviceName: deviceName,
                    DeviceType: deviceType,
                    FCMToken: fcmToken || existingByDeviceId.FCMToken,
                    LastLogin: new Date(),
                    UpdatedAt: new Date(),
                },
            });
        }

        return this.prisma.user_devices.create({
            data: {
                UserID: userId,
                DeviceName: deviceName,
                DeviceID: deviceId,
                DeviceType: deviceType,
                FCMToken: fcmToken,
                LastLogin: new Date(),
            },
        });
    }

    async getUserDevices(userId: number) {
        return this.prisma.user_devices.findMany({
            where: { UserID: userId, IsDeleted: false },
            orderBy: { LastLogin: 'desc' },
        });
    }

    async getDevicesByUserId(userId: number) {
        const userExists = await this.prisma.users.findUnique({ where: { UserID: userId } });
        if (!userExists) throwError(ErrorCodes.NOT_FOUND, 'User not found');
        return this.prisma.user_devices.findMany({
            where: { UserID: userId, IsDeleted: false },
            orderBy: { LastLogin: 'desc' },
        });
    }

    async revokeDevice(userDeviceId: number, requesterId: number, requesterRole: string) {
        const device = await this.prisma.user_devices.findUnique({
            where: { UserDeviceID: userDeviceId },
        });
        if (!device || device.IsDeleted) throwError(ErrorCodes.NOT_FOUND, 'Device not found or already revoked');

        // @ts-ignore
        if (device.UserID !== requesterId && requesterRole !== 'admin') {
            throwError(ErrorCodes.FORBIDDEN, 'You can only revoke your own devices');
        }

        await this.prisma.synctracking.updateMany({
            where: { UserDeviceID: userDeviceId, IsDeleted: false },
            data: { IsDeleted: true },
        });

        return this.prisma.user_devices.update({
            where: { UserDeviceID: userDeviceId },
            data: {
                IsDeleted: true,
                LastLogoutAt: new Date(),
                UpdatedAt: new Date(),
            },
        });
    }

    async logoutDevice(userDeviceId: number, userId: number, ipAddress?: string) {
        const device = await this.prisma.user_devices.findUnique({
            where: { UserDeviceID: userDeviceId },
        });
        if (!device || device.IsDeleted) {
            throwError(ErrorCodes.NOT_FOUND, 'Device not found or already revoked');
        }
        // @ts-ignore
        if (device.UserID !== userId) {
            throwError(ErrorCodes.FORBIDDEN, 'You can only log out from your own devices');
        }

        await this.prisma.synctracking.create({
            data: {
                UserID: userId,
                UserDeviceID: userDeviceId,
                IPAddress: ipAddress || 'unknown',
                LastSyncedAt: new Date(),
                SyncType: 'logout',
                SyncStatus: 'success',
            },
        });

        return this.prisma.user_devices.update({
            where: { UserDeviceID: userDeviceId },
            data: {
                LastLogoutAt: new Date(),
                UpdatedAt: new Date(),
            },
        });
    }

    async logoutDevices(userDeviceIds: number[], userId: number, ipAddress?: string) {
        const devices = await this.prisma.user_devices.findMany({
            where: { UserDeviceID: { in: userDeviceIds }, IsDeleted: false },
        });

        if (devices.length === 0) throwError(ErrorCodes.NOT_FOUND, 'No valid devices found');
        if (devices.some(device => device.UserID !== userId)) {
            throwError(ErrorCodes.FORBIDDEN, 'You can only log out from your own devices');
        }

        const updatedDevices = await Promise.all(
            devices.map(async (device) => {
                await this.prisma.synctracking.create({
                    data: {
                        UserID: userId,
                        UserDeviceID: device.UserDeviceID,
                        IPAddress: ipAddress || 'unknown',
                        LastSyncedAt: new Date(),
                        SyncType: 'logout',
                        SyncStatus: 'success',
                    },
                });

                return this.prisma.user_devices.update({
                    where: { UserDeviceID: device.UserDeviceID },
                    data: {
                        LastLogoutAt: new Date(),
                        UpdatedAt: new Date(),
                    },
                });
            })
        );

        return updatedDevices;
    }

    async logoutAllDevices(userId: number, ipAddress?: string) {
        const devices = await this.getUserDevices(userId);
        if (devices.length === 0) return [];

        const updatedDevices = await Promise.all(
            devices.map(async (device) => {
                await this.prisma.synctracking.create({
                    data: {
                        UserID: userId,
                        UserDeviceID: device.UserDeviceID,
                        IPAddress: ipAddress || 'unknown',
                        LastSyncedAt: new Date(),
                        SyncType: 'logout',
                        SyncStatus: 'success',
                    },
                });

                return this.prisma.user_devices.update({
                    where: { UserDeviceID: device.UserDeviceID },
                    data: {
                        LastLogoutAt: new Date(),
                        UpdatedAt: new Date(),
                    },
                });
            })
        );

        return updatedDevices;
    }
}