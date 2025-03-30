import { PrismaClient } from '@prisma/client';
import { throwError, ErrorCodes } from '../utils/errors';

export class UserDeviceService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    // Add or update device on login
    async upsertDevice(userId: number, deviceName: string, deviceId: string, deviceToken?: string) {
        const existingDevice = await this.prisma.user_devices.findFirst({
            where: { UserID: userId, DeviceID: deviceId },
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

    // Get user's own devices
    async getUserDevices(userId: number) {
        return this.prisma.user_devices.findMany({
            where: { UserID: userId, IsDeleted: false },
            orderBy: { LastLogin: 'desc' },
        });
    }

    // Get devices for any user (admin only)
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
        if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');

        // User can revoke their own device, admin can revoke any
        if (device!.UserID !== requesterId && requesterRole !== 'admin') {
            throwError(ErrorCodes.FORBIDDEN, 'You can only revoke your own devices');
        }

        return this.prisma.user_devices.update({
            where: { UserDeviceID: userDeviceId },
            data: { IsDeleted: true, UpdatedAt: new Date() },
        });
    }
}