import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { FirmwareUpdateHistory } from '../types/auth';

class FirmwareUpdateHistoryService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createFirmwareUpdateHistory(input: {
        device_serial: string;
        firmware_id: number;
        status?: string;
    }): Promise<FirmwareUpdateHistory> {
        const { device_serial, firmware_id, status } = input;

        const device = await this.prisma.devices.findUnique({
            where: { serial_number: device_serial, is_deleted: false },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');

        const firmware = await this.prisma.firmware.findUnique({
            where: { firmware_id, is_deleted: false },
        });
        if (!firmware) throwError(ErrorCodes.NOT_FOUND, 'Firmware not found');

        const firmwareUpdateHistory = await this.prisma.firmware_update_history.create({
            data: {
                device_serial,
                firmware_id,
                status: status || 'success',
                created_at: new Date(),
                updated_at: new Date(),
            },
        });

        return this.mapPrismaFirmwareUpdateHistoryToAuth(firmwareUpdateHistory);
    }

    async updateFirmwareUpdateHistory(updateId: number, input: { status?: string }): Promise<FirmwareUpdateHistory> {
        const firmwareUpdateHistory = await this.prisma.firmware_update_history.findUnique({
            where: { update_id: updateId, is_deleted: false },
        });
        if (!firmwareUpdateHistory) throwError(ErrorCodes.NOT_FOUND, 'Firmware update history not found');

        const updatedFirmwareUpdateHistory = await this.prisma.firmware_update_history.update({
            where: { update_id: updateId },
            data: {
                status: input.status || firmwareUpdateHistory!.status,
                updated_at: new Date(),
            },
        });

        return this.mapPrismaFirmwareUpdateHistoryToAuth(updatedFirmwareUpdateHistory);
    }

    async deleteFirmwareUpdateHistory(updateId: number): Promise<void> {
        const firmwareUpdateHistory = await this.prisma.firmware_update_history.findUnique({
            where: { update_id: updateId, is_deleted: false },
        });
        if (!firmwareUpdateHistory) throwError(ErrorCodes.NOT_FOUND, 'Firmware update history not found');

        await this.prisma.firmware_update_history.update({
            where: { update_id: updateId },
            data: { is_deleted: true, updated_at: new Date() },
        });
    }

    async getFirmwareUpdateHistoryById(updateId: number, accountId: string): Promise<FirmwareUpdateHistory> {
        const firmwareUpdateHistory = await this.prisma.firmware_update_history.findUnique({
            where: { update_id: updateId, is_deleted: false },
            include: { devices: true },
        });
        if (!firmwareUpdateHistory) throwError(ErrorCodes.NOT_FOUND, 'Firmware update history not found');

        // Check permission for non-employee users
        const isEmployee = await this.isEmployee(accountId);
        if (!isEmployee) {
            await this.checkDevicePermission(firmwareUpdateHistory!.device_serial!, accountId);
        }

        return this.mapPrismaFirmwareUpdateHistoryToAuth(firmwareUpdateHistory);
    }

    async getFirmwareUpdateHistories(filter: {
        user_id?: string;
        device_serial?: string;
        firmware_id?: number;
        created_at_start?: Date;
        created_at_end?: Date;
        page?: number;
        limit?: number;
    }, accountId: string): Promise<FirmwareUpdateHistory[]> {
        const { user_id, device_serial, firmware_id, created_at_start, created_at_end, page = 1, limit = 10 } = filter;

        const isEmployee = await this.isEmployee(accountId);
        const where: any = { is_deleted: false };

        if (device_serial) {
            where.device_serial = device_serial;
        }
        if (firmware_id) {
            where.firmware_id = firmware_id;
        }
        if (created_at_start || created_at_end) {
            where.created_at = {};
            if (created_at_start) where.created_at.gte = created_at_start;
            if (created_at_end) where.created_at.lte = created_at_end;
        }

        if (!isEmployee) {
            // Restrict to devices the user has access to
            where.devices = {
                OR: [
                    { account_id: accountId },
                    { spaces: { houses: { group_id: { in: (await this.getUserGroupIds(accountId)) } }}} ,
                    { shared_permissions: { shared_with_user_id: accountId, is_deleted: false } },
                ],
            };
        } else if (user_id) {
                // Employees can filter by user_id
                where.devices = { account_id: user_id };
            }

            const firmwareUpdateHistories = await this.prisma.firmware_update_history.findMany({
                where,
                include: { devices: true, firmware: true },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
            });

            return firmwareUpdateHistories.map((history) => this.mapPrismaFirmwareUpdateHistoryToAuth(history));
        }

    private async isEmployee(accountId: string): Promise<boolean> {
            const account = await this.prisma.account.findUnique({
                where: { account_id: accountId },
                include: { role: true },
            });
            return !!account?.role_id && ['ADMIN', 'TECHNICIAN'].includes(account!.role!.name!);
        }

    private async getUserGroupIds(accountId: string): Promise<number[]> {
            const userGroups = await this.prisma.user_groups.findMany({
                where: { account_id: accountId, is_deleted: false },
                select: { group_id: true },
            });
            return userGroups.map((ug) => ug.group_id!);
        }

    private async checkDevicePermission(device_serial: string, accountId: string): Promise<void> {
            const device = await this.prisma.devices.findUnique({
                where: { serial_number: device_serial, is_deleted: false },
                include: { spaces: { include: { houses: true } } },
            });
            if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');

        if (device!.account_id === accountId) return;

        const groupId = device!.group_id || device!.spaces?.houses?.group_id;
        if (groupId) {
            const userGroup = await this.prisma.user_groups.findFirst({
                where: { group_id: groupId, account_id: accountId, is_deleted: false },
            });
            if (userGroup) return;
        }

        const permission = await this.prisma.shared_permissions.findFirst({
            where: { device_serial, shared_with_user_id: accountId, is_deleted: false },
        });
        if (permission) return;

        throwError(ErrorCodes.FORBIDDEN, 'No permission to access this device');
    }

    private mapPrismaFirmwareUpdateHistoryToAuth(history: any): FirmwareUpdateHistory {
            return {
                update_id: history.update_id,
                device_serial: history.device_serial ?? null,
                firmware_id: history.firmware_id ?? null,
                updated_at: history.updated_at ?? null,
                status: history.status ?? null,
                created_at: history.created_at ?? null,
                is_deleted: history.is_deleted ?? null,
            };
        }
    }

    export default FirmwareUpdateHistoryService;
