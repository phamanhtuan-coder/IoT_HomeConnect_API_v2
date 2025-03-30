import { PrismaClient } from '@prisma/client';
import { throwError, ErrorCodes } from '../utils/errors';

export class SyncTrackingService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    // Record login sync event
    async recordLogin(userId: number, userDeviceId: number, ipAddress: string) {
        return this.prisma.synctracking.create({
            data: {
                UserID: userId,
                UserDeviceID: userDeviceId,
                IPAddress: ipAddress,
                LastSyncedAt: new Date(),
                SyncType: 'login',
                SyncStatus: 'success',
            },
        });
    }

    // Private helper to get latest syncs per device
    private async getLatestSyncsPerDevice(userId: number, devices: { UserDeviceID: number }[]) {
        const latestSyncs = await Promise.all(
            devices.map(async (device) => {
                return this.prisma.synctracking.findFirst({
                    where: {
                        UserID: userId,
                        UserDeviceID: device.UserDeviceID,
                        IsDeleted: false,
                    },
                    include: { user_devices: { select: { DeviceName: true, DeviceID: true } } },
                    orderBy: { LastSyncedAt: 'desc' },
                });
            })
        );
        return latestSyncs.filter(sync => sync !== null);
    }

    // Get user's own sync history (latest per device)
    async getUserSyncHistory(userId: number) {
        const devices = await this.prisma.user_devices.findMany({
            where: { UserID: userId, IsDeleted: false },
            select: { UserDeviceID: true },
        });
        return this.getLatestSyncsPerDevice(userId, devices);
    }

    // Get sync history for any user (admin only, latest per device)
    async getSyncHistoryByUserId(userId: number) {
        const userExists = await this.prisma.users.findUnique({ where: { UserID: userId } });
        if (!userExists) throwError(ErrorCodes.NOT_FOUND, 'User not found');

        const devices = await this.prisma.user_devices.findMany({
            where: { UserID: userId, IsDeleted: false },
            select: { UserDeviceID: true },
        });
        return this.getLatestSyncsPerDevice(userId, devices);
    }

    // Get full sync history (for debugging, admin only)
    async getFullSyncHistory(userId: number) {
        const userExists = await this.prisma.users.findUnique({ where: { UserID: userId } });
        if (!userExists) throwError(ErrorCodes.NOT_FOUND, 'User not found');
        return this.prisma.synctracking.findMany({
            where: { UserID: userId, IsDeleted: false },
            include: { user_devices: { select: { DeviceName: true, DeviceID: true } } },
            orderBy: { LastSyncedAt: 'desc' },
        });
    }
}