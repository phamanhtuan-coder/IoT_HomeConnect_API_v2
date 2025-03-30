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

    // Get sync history for user's own devices
    async getUserSyncHistory(userId: number) {
        return this.prisma.synctracking.findMany({
            where: { UserID: userId, IsDeleted: false },
            include: { user_devices: { select: { DeviceName: true, DeviceID: true } } },
            orderBy: { LastSyncedAt: 'desc' },
        });
    }

    // Get sync history for any user (admin only)
    async getSyncHistoryByUserId(userId: number) {
        const userExists = await this.prisma.users.findUnique({ where: { UserID: userId } });
        if (!userExists) throwError(ErrorCodes.NOT_FOUND, 'User not found');
        return this.prisma.synctracking.findMany({
            where: { UserID: userId, IsDeleted: false },
            include: { user_devices: { select: { DeviceName: true, DeviceID: true } } },
            orderBy: { LastSyncedAt: 'desc' },
        });
    }
}