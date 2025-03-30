import { PrismaClient } from '@prisma/client';
import { throwError, ErrorCodes } from '../utils/errors';
import { blacklistToken } from '../utils/redis';

export class UserDeviceService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    // Add or update device on login
    async upsertDevice(userId: number, deviceName: string, deviceId: string, deviceToken?: string) {
        const existingDevice = await this.prisma.user_devices.findFirst({
            where: { UserID: userId, DeviceID: deviceId, IsDeleted: false },
        });

        if (existingDevice) {
            return this.prisma.user_devices.update({
                where: { UserDeviceID: existingDevice.UserDeviceID },
                data: {
                    DeviceName: deviceName,
                    DeviceToken: deviceToken || existingDevice.DeviceToken,
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
                DeviceToken: deviceToken,
                LastLogin: new Date(),
            },
        });
    }

    // Get user's own devices (only active)
    async getUserDevices(userId: number) {
        return this.prisma.user_devices.findMany({
            where: { UserID: userId, IsDeleted: false },
            orderBy: { LastLogin: 'desc' },
        });
    }

    // Get devices for any user (admin only, only active)
    async getDevicesByUserId(userId: number) {
        const userExists = await this.prisma.users.findUnique({ where: { UserID: userId } });
        if (!userExists) throwError(ErrorCodes.NOT_FOUND, 'User not found');
        return this.prisma.user_devices.findMany({
            where: { UserID: userId, IsDeleted: false },
            orderBy: { LastLogin: 'desc' },
        });
    }

    // Revoke device login
    async revokeDevice(userDeviceId: number, requesterId: number, requesterRole: string) {
        const device = await this.prisma.user_devices.findUnique({
            where: { UserDeviceID: userDeviceId },
        });
        if (!device || device!.IsDeleted) throwError(ErrorCodes.NOT_FOUND, 'Device not found or already revoked');

        if (device!.UserID !== requesterId && requesterRole !== 'admin') {
            throwError(ErrorCodes.FORBIDDEN, 'You can only revoke your own devices');
        }

        await this.prisma.synctracking.updateMany({
            where: { UserDeviceID: userDeviceId, IsDeleted: false },
            data: { IsDeleted: true },
        });

        if (device!.DeviceToken) {
            await blacklistToken(device!.DeviceToken, 30 * 24 * 60 * 60); // 30 days in seconds
        }

        return this.prisma.user_devices.update({
            where: { UserDeviceID: userDeviceId },
            data: {
                IsDeleted: true,
                LastLogoutAt: new Date(),
                UpdatedAt: new Date(),
                DeviceToken: null,
            },
        });
    }

    // Logout from a device (does not revoke, just logs out)
    async logoutDevice(userDeviceId: number, userId: number, ipAddress?: string) {
        const device = await this.prisma.user_devices.findUnique({
            where: { UserDeviceID: userDeviceId },
        });
        if (!device || device!.IsDeleted) {
            throwError(ErrorCodes.NOT_FOUND, 'Device not found or already revoked');
        }
        if (device!.UserID !== userId) {
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

        if (device!.DeviceToken) {
            await blacklistToken(device!.DeviceToken, 30 * 24 * 60 * 60); // Blacklist for 30 days
        }

        return this.prisma.user_devices.update({
            where: { UserDeviceID: userDeviceId },
            data: {
                LastLogoutAt: new Date(),
                DeviceToken: null,
                UpdatedAt: new Date(),
            },
        });
    }

    // Logout multiple devices
    async logoutDevices(userDeviceIds: number[], userId: number, ipAddress?: string) {
        const devices = await this.prisma.user_devices.findMany({
            where: { UserDeviceID: { in: userDeviceIds }, IsDeleted: false },
        });

        if (devices.length === 0) throwError(ErrorCodes.NOT_FOUND, 'No valid devices found');
        if (devices.some(device => device!.UserID !== userId)) {
            throwError(ErrorCodes.FORBIDDEN, 'You can only log out from your own devices');
        }

        await Promise.all(
            devices.map(async (device) => {
                await this.prisma.synctracking.create({
                    data: {
                        UserID: userId,
                        UserDeviceID: device!.UserDeviceID,
                        IPAddress: ipAddress || 'unknown',
                        LastSyncedAt: new Date(),
                        SyncType: 'logout',
                        SyncStatus: 'success',
                    },
                });

                if (device!.DeviceToken) {
                    await blacklistToken(device!.DeviceToken, 30 * 24 * 60 * 60);
                }

                await this.prisma.user_devices.update({
                    where: { UserDeviceID: device!.UserDeviceID },
                    data: {
                        LastLogoutAt: new Date(),
                        DeviceToken: null,
                        UpdatedAt: new Date(),
                    },
                });
            })
        );
    }

    // Logout all devices
    async logoutAllDevices(userId: number, ipAddress?: string) {
        const devices = await this.getUserDevices(userId);
        if (devices.length === 0) return; // Nothing to logout

        await Promise.all(
            devices.map(async (device) => {
                await this.prisma.synctracking.create({
                    data: {
                        UserID: userId,
                        UserDeviceID: device!.UserDeviceID,
                        IPAddress: ipAddress || 'unknown',
                        LastSyncedAt: new Date(),
                        SyncType: 'logout',
                        SyncStatus: 'success',
                    },
                });

                if (device!.DeviceToken) {
                    await blacklistToken(device!.DeviceToken, 30 * 24 * 60 * 60);
                }

                await this.prisma.user_devices.update({
                    where: { UserDeviceID: device!.UserDeviceID },
                    data: {
                        LastLogoutAt: new Date(),
                        DeviceToken: null,
                        UpdatedAt: new Date(),
                    },
                });
            })
        );
    }
}