import {PrismaClient} from '@prisma/client';
import {ErrorCodes, throwError} from '../utils/errors';
import {generateUserDeviceId} from '../utils/helpers'

export class UserDeviceService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async upsertDevice(accountId: string, deviceName: string, deviceId: string, deviceUuid: string | null, fcmToken?: string) {
        if (!deviceId) throwError(ErrorCodes.BAD_REQUEST, 'Device ID is required');
        if (!deviceName) throwError(ErrorCodes.BAD_REQUEST, 'Device name is required');

        const account = await this.prisma.account.findUnique({ where: { account_id: accountId } });
        if (!account) throwError(ErrorCodes.NOT_FOUND, 'Account not found');

        const isEmployee = account!.employee_id !== null;
        const maxDevices = isEmployee ? 1 : 5;

        const deviceCount = await this.prisma.user_devices.count({
            where: { user_id: accountId, is_deleted: false },
        });

        let deviceUuidToUse = deviceUuid;
        if (!deviceUuidToUse) {
            const existingByDeviceId = await this.prisma.user_devices.findFirst({
                where: { user_id: accountId, device_id: deviceId, is_deleted: false },
            });
            if (existingByDeviceId) {
                deviceUuidToUse = existingByDeviceId.device_uuid;
            } else {
                let attempts = 0;
                const maxAttempts = 5;
                do {
                    deviceUuidToUse = generateUserDeviceId(Date.now()); // Pass Date.now() for dynamic seed
                    const uuidExists = await this.prisma.user_devices.findFirst({
                        where: { device_uuid: deviceUuidToUse, is_deleted: false },
                    });
                    if (!uuidExists) break;
                    attempts++;
                    if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique device UUID');
                } while (true);
            }
        }

        const existingDevice = await this.prisma.user_devices.findFirst({
            where: { user_id: accountId, device_uuid: deviceUuidToUse, is_deleted: false },
        });

        if (existingDevice) {
            return this.prisma.user_devices.update({
                where: { user_device_id: existingDevice.user_device_id },
                data: {
                    device_name: deviceName,
                    device_id: deviceId,
                    device_token: fcmToken || existingDevice.device_token,
                    last_login: new Date(),
                    updated_at: new Date(),
                },
            });
        }

        if (deviceCount >= maxDevices) {
            throwError(ErrorCodes.FORBIDDEN, 'Maximum device limit reached. Please revoke an existing device.');
        }

        return this.prisma.user_devices.create({
            data: {
                user_id: accountId,
                device_name: deviceName,
                device_id: deviceId,
                device_uuid: deviceUuidToUse,
                device_token: fcmToken,
                last_login: new Date(),
            },
        });
    }

    async getUserDevices(accountId: string) {
        return this.prisma.user_devices.findMany({
            where: { user_id: accountId, is_deleted: false },
            orderBy: { last_login: 'desc' },
        });
    }

    async getDevicesByUserId(accountId: string) {
        const accountExists = await this.prisma.account.findUnique({ where: { account_id: accountId } });
        if (!accountExists) throwError(ErrorCodes.NOT_FOUND, 'Account not found');
        return this.prisma.user_devices.findMany({
            where: { user_id: accountId, is_deleted: false },
            orderBy: { last_login: 'desc' },
        });
    }

    async revokeDevice(userDeviceId: number, requesterId: string, requesterRole: string) {
        const device = await this.prisma.user_devices.findUnique({
            where: { user_device_id: userDeviceId },
        });
        if (!device) {
            throwError(ErrorCodes.NOT_FOUND, 'Device not found');
        } else if (device.is_deleted) {
            throwError(ErrorCodes.NOT_FOUND, 'Device already revoked');
        }

        if (device!.user_id !== requesterId && requesterRole !== 'ADMIN') {
            throwError(ErrorCodes.FORBIDDEN, 'You can only revoke your own devices');
        }

        await this.prisma.sync_tracking.updateMany({
            where: { user_device_id: userDeviceId, is_deleted: false },
            data: { is_deleted: true },
        });

        return this.prisma.user_devices.update({
            where: { user_device_id: userDeviceId },
            data: {
                is_deleted: true,
                last_out: new Date(),
                updated_at: new Date(),
            },
        });
    }

    async logoutDevice(userDeviceId: number, accountId: string, ipAddress?: string) {
        const device = await this.prisma.user_devices.findUnique({
            where: { user_device_id: userDeviceId },
        });
        if (!device) {
            throwError(ErrorCodes.NOT_FOUND, 'Device not found');
        } else if (device.is_deleted) {
            throwError(ErrorCodes.NOT_FOUND, 'Device already revoked');
        }

        if (device!.user_id !== accountId) {
            throwError(ErrorCodes.FORBIDDEN, 'You can only log out from your own devices');
        }

        await this.prisma.sync_tracking.create({
            data: {
                account_id: accountId,
                user_device_id: userDeviceId,
                ip_address: ipAddress || 'unknown',
                last_synced_at: new Date(),
                sync_type: 'logout',
                sync_status: 'success',
            },
        });

        return this.prisma.user_devices.update({
            where: { user_device_id: userDeviceId },
            data: {
                last_out: new Date(),
                updated_at: new Date(),
            },
        });
    }

    async logoutDevices(userDeviceIds: number[], accountId: string, ipAddress?: string) {
        const devices = await this.prisma.user_devices.findMany({
            where: { user_device_id: { in: userDeviceIds }, is_deleted: false },
        });

        if (devices.length === 0) throwError(ErrorCodes.NOT_FOUND, 'No valid devices found');

        // if (devices.some((device: { user_id: string; }) => device.user_id !== accountId)) {
        //     throwError(ErrorCodes.FORBIDDEN, 'You can only log out from your own devices');
        // }


        return await Promise.all(
            devices.map(async (device: { user_device_id: any; }) => {
                await this.prisma.sync_tracking.create({
                    data: {
                        account_id: accountId,
                        user_device_id: device.user_device_id,
                        ip_address: ipAddress || 'unknown',
                        last_synced_at: new Date(),
                        sync_type: 'logout',
                        sync_status: 'success',
                    },
                });

                return this.prisma.user_devices.update({
                    where: {user_device_id: device.user_device_id},
                    data: {
                        last_out: new Date(),
                        updated_at: new Date(),
                    },
                });
            })
        );
    }

    async logoutAllDevices(accountId: string, ipAddress?: string) {
        const devices = await this.getUserDevices(accountId);
        if (devices.length === 0) return [];

        return await Promise.all(
            devices.map(async (device: { user_device_id: any; }) => {
                await this.prisma.sync_tracking.create({
                    data: {
                        account_id: accountId,
                        user_device_id: device.user_device_id,
                        ip_address: ipAddress || 'unknown',
                        last_synced_at: new Date(),
                        sync_type: 'logout',
                        sync_status: 'success',
                    },
                });

                return this.prisma.user_devices.update({
                    where: {user_device_id: device.user_device_id},
                    data: {
                        last_out: new Date(),
                        updated_at: new Date(),
                    },
                });
            })
        );
    }
}