import {PrismaClient} from '@prisma/client';
import {ErrorCodes, get_error_response, throwError} from '../utils/errors';
import {generateUserDeviceId} from '../utils/helpers';
import { DeviceCache } from '../utils/device-cache';
import { STATUS_CODE } from '../contants/status';
import { ERROR_CODES } from '../contants/error';
import prisma from "../config/database";

export class UserDeviceService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma
    }

    async upsertDevice(accountId: string, deviceName: string, deviceId: string, deviceUuid: string | null, fcmToken?: string) {
        if (!deviceId) throwError(ErrorCodes.BAD_REQUEST, 'Device ID is required');
        if (!deviceName) throwError(ErrorCodes.BAD_REQUEST, 'Device name is required');

        const account = await this.prisma.account.findUnique({ where: { account_id: accountId } });
        if (!account) throwError(ErrorCodes.NOT_FOUND, 'Account not found');

        const isEmployee = account!.employee_id !== null;
        // Cập nhật giới hạn thiết bị cho nhân viên từ 1 lên 5
        const maxDevices = 5;

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
                    deviceUuidToUse = generateUserDeviceId(); // Pass Date.now() for dynamic seed
                    const uuidExists = await this.prisma.user_devices.findFirst({
                        where: { device_uuid: deviceUuidToUse, is_deleted: false },
                    });
                    if (!uuidExists) break;
                    attempts++;
                    if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique device.ts UUID');
                } while (true);
            }
        }

        const existingDevice = await this.prisma.user_devices.findFirst({
            where: { user_id: accountId, device_uuid: deviceUuidToUse, is_deleted: false },
        });

        const result = existingDevice
            ? await this.prisma.user_devices.update({
                where: { user_device_id: existingDevice.user_device_id },
                data: {
                    device_name: deviceName,
                    device_id: deviceId,
                    device_token: fcmToken || existingDevice.device_token,
                    last_login: new Date(),
                    updated_at: new Date(),
                },
            })
            : await this.prisma.user_devices.create({
                data: {
                    // @ts-ignore
                    user_device_id: deviceUuidToUse,
                    user_id: accountId,
                    device_name: deviceName,
                    device_id: deviceId,
                    device_uuid: deviceUuidToUse,
                    device_token: fcmToken,
                    last_login: new Date(),
                },
            });

        // Xóa cache khi có thay đổi
        await DeviceCache.invalidateDeviceCache(`user:${accountId}:devices`);

        return result;
    }

    async getUserDevices(accountId: string) {
        // Thử lấy từ cache trước
        const cacheKey = `user:${accountId}:devices`;
        const cachedDevices = await DeviceCache.getDeviceInfo(cacheKey);
        if (cachedDevices) {
            return cachedDevices;
        }

        // Nếu không có trong cache, lấy từ database
        const devices = await this.prisma.user_devices.findMany({
            where: { user_id: accountId, is_deleted: false },
            orderBy: { last_login: 'desc' },
        });

        // Cache kết quả
        await DeviceCache.setDeviceInfo(cacheKey, devices);

        return devices;
    }

    async getDevicesByUserId(accountId: string) {
        const accountExists = await this.prisma.account.findFirst({ where: { account_id: accountId } });
        if (!accountExists) throwError(ErrorCodes.NOT_FOUND, 'Account not found');
        return this.prisma.user_devices.findMany({
            where: { user_id: accountId, is_deleted: false },
            orderBy: { last_login: 'desc' },
        });
    }

    async revokeDevice(userDeviceId: string, requesterId: string, requesterRole: string) {
        const device = await this.prisma.user_devices.findFirst({
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

    async logoutDevice(userDeviceId: string, accountId: string, ipAddress?: string) {
        const device = await this.prisma.user_devices.findFirst({
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

        await this.prisma.$transaction(async (prisma) => {
            await prisma.sync_tracking.create({
                data: {
                    account_id: accountId,
                    user_device_id: userDeviceId,
                    ip_address: ipAddress || 'unknown',
                    last_synced_at: new Date(),
                    sync_type: 'logout',
                    sync_status: 'success',
                },
            });

            await prisma.user_devices.update({
                where: { user_device_id: userDeviceId },
                data: {
                    last_out: new Date(),
                    updated_at: new Date(),
                },
            });
        });

        // Xóa cache khi có thay đổi
        await DeviceCache.invalidateDeviceCache(`user:${accountId}:devices`);
    }

    async logoutDevices(userDeviceIds: string[], accountId: string, ipAddress?: string) {
        const devices = await this.prisma.user_devices.findMany({
            where: { user_device_id: { in: userDeviceIds }, is_deleted: false },
        });

        if (devices.length === 0) throwError(ErrorCodes.NOT_FOUND, 'No valid devices found');

        // Sử dụng transaction để đảm bảo tính nhất quán của dữ liệu
        return await this.prisma.$transaction(async (prisma) => {
            const logoutPromises = devices.map(async (device) => {
                // Tạo sync tracking record
                await prisma.sync_tracking.create({
                    data: {
                        account_id: accountId,
                        user_device_id: device.user_device_id,
                        ip_address: ipAddress || 'unknown',
                        last_synced_at: new Date(),
                        sync_type: 'logout',
                        sync_status: 'success',
                    }
                });

                // Cập nhật trạng thái thiết bị
                return prisma.user_devices.update({
                    where: { user_device_id: device.user_device_id },
                    data: {
                        last_out: new Date(),
                        updated_at: new Date(),
                    }
                });
            });

            return Promise.all(logoutPromises);
        });
    }

    async logoutAllDevices(accountId: string, ipAddress?: string) {
        const devices = await this.getUserDevices(accountId);
        if (devices.length === 0) return [];

        // Sử dụng transaction để đảm bảo tính nhất quán của dữ liệu
        return await this.prisma.$transaction(async (prisma) => {
            const logoutPromises = devices.map(async (device) => {
                // Tạo sync tracking record
                await prisma.sync_tracking.create({
                    data: {
                        account_id: accountId,
                        user_device_id: device.user_device_id,
                        ip_address: ipAddress || 'unknown',
                        last_synced_at: new Date(),
                        sync_type: 'logout',
                        sync_status: 'success',
                    }
                });

                // Cập nhật trạng thái thiết bị
                return prisma.user_devices.update({
                    where: { user_device_id: device.user_device_id },
                    data: {
                        last_out: new Date(),
                        updated_at: new Date(),
                    }
                });
            });

            return Promise.all(logoutPromises);
        });
    }

    async lockDevice(deviceId: string, serial_number: string, accountId: string) {
        const device = await this.prisma.devices.findFirst({
            where: { device_id: deviceId, serial_number: serial_number },
        });
        if (!device) {
            throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy thiết bị');
        }

        if (device?.lock_status === 'locked') {
            throwError(ErrorCodes.NOT_FOUND, 'Thiết bị đã bị khóa');
        }

        if (device?.account_id !== accountId) {
            throwError(ErrorCodes.FORBIDDEN, 'Bạn chỉ có thể khóa thiết bị của mình');
        }

        await this.prisma.devices.update({
            where: {
                device_id_serial_number: {
                    device_id: deviceId,
                    serial_number: serial_number
                }
            },
            data: { lock_status: 'locked' },
        });

        // await this.prisma.sync_tracking.updateMany({
        //     where: { device_id: deviceId, is_deleted: false },
        //     data: { lock_status: 'locked' },
        // });

        return get_error_response(
            ERROR_CODES.SUCCESS,
            STATUS_CODE.OK,
            'Thiết bị đã được khóa thành công'
        )
    }
}