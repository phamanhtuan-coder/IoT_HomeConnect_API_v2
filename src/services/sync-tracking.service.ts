import { PrismaClient } from '@prisma/client';
import { throwError, ErrorCodes } from '../utils/errors';

export class SyncTrackingService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async recordLogin(accountId: string, userDeviceId:string, ipAddress: string) {
        return this.prisma.sync_tracking.create({
            data: {
                account_id: accountId,
                user_device_id: userDeviceId,
                ip_address: ipAddress,
                last_synced_at: new Date(),
                sync_type: 'login',
                sync_status: 'success',
            },
        });
    }

    private async getLatestSyncsPerDevice(accountId: string, devices: { user_device_id: string }[]) {
        const latestSyncs = await Promise.all(
            devices.map(async (device) => {
                return this.prisma.sync_tracking.findFirst({
                    where: {
                        account_id: accountId,
                        user_device_id: device.user_device_id,
                        is_deleted: false,
                    },
                    include: { user_devices: { select: { device_name: true, device_id: true, device_uuid: true } } },
                    orderBy: { last_synced_at: 'desc' },
                });
            })
        );
        return latestSyncs.filter(sync => sync !== null);
    }

    async getUserSyncHistory(accountId: string) {
        const devices = await this.prisma.user_devices.findMany({
            where: { user_id: accountId, is_deleted: false },
            select: { user_device_id: true },
        });
        return this.getLatestSyncsPerDevice(accountId, devices);
    }

    async getSyncHistoryByUserId(accountId: string) {
        const accountExists = await this.prisma.account.findFirst({ where: { account_id: accountId } });
        if (!accountExists) throwError(ErrorCodes.NOT_FOUND, 'Account not found');

        const devices = await this.prisma.user_devices.findMany({
            where: { user_id: accountId, is_deleted: false },
            select: { user_device_id: true },
        });
        return this.getLatestSyncsPerDevice(accountId, devices);
    }

    async getFullSyncHistory(accountId: string) {
        const accountExists = await this.prisma.account.findFirst({ where: { account_id: accountId } });
        if (!accountExists) throwError(ErrorCodes.NOT_FOUND, 'Account not found');
        return this.prisma.sync_tracking.findMany({
            where: { account_id: accountId, is_deleted: false },
            include: { user_devices: { select: { device_name: true, device_id: true, device_uuid: true } } },
            orderBy: { last_synced_at: 'desc' },
        });
    }
}