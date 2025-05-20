import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { Firmware } from '../types/auth';

class FirmwareService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createFirmware(input: {
        version: string;
        file_path: string;
        template_id?: number;
        is_mandatory?: boolean;
        note?: string;
    }): Promise<Firmware> {
        const { version, file_path, template_id, is_mandatory, note } = input;

        if (template_id) {
            const template = await this.prisma.device_templates.findUnique({
                where: { template_id: template_id, is_deleted: false },
            });
            if (!template) throwError(ErrorCodes.NOT_FOUND, 'Device template not found');
        }

        const existingFirmware = await this.prisma.firmware!.findFirst({
            where: { version, template_id: template_id || null, is_deleted: false },
        });
        if (existingFirmware) throwError(ErrorCodes.CONFLICT, 'Firmware version already exists for this template');

        const firmware = await this.prisma.firmware!.create({
            data: {
                version,
                file_path,
                template_id: template_id || null,
                is_mandatory: is_mandatory || false,
                note,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });

        return this.mapPrismaFirmwareToAuthFirmware(firmware);
    }

    async updateFirmware(firmwareId: number, input: {
        version?: string;
        file_path?: string;
        template_id?: number;
        is_mandatory?: boolean;
        is_approved?: boolean;
        tested_at?: Date;
        note?: string;
    }): Promise<Firmware> {
        const firmware = await this.prisma.firmware!.findUnique({
            where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (!firmware) throwError(ErrorCodes.NOT_FOUND, 'Firmware not found');

        if (input.template_id) {
            const template = await this.prisma.device_templates.findUnique({
                where: { template_id: input.template_id, is_deleted: false },
            });
            if (!template) throwError(ErrorCodes.NOT_FOUND, 'Device template not found');
        }

        if (input.version && input.version !== firmware!.version) {
            const existingFirmware = await this.prisma.firmware!.findFirst({
                where: { version: input.version, template_id: input.template_id || firmware!.template_id, is_deleted: false },
            });
            if (existingFirmware) throwError(ErrorCodes.CONFLICT, 'Firmware version already exists for this template');
        }

        const updatedFirmware = await this.prisma.firmware!.update({
            where: { firmware_id: firmwareId },
            data: {
                version: input.version || firmware!.version,
                file_path: input.file_path || firmware!.file_path,
                template_id: input.template_id !== undefined ? input.template_id : firmware!.template_id,
                is_mandatory: input.is_mandatory !== undefined ? input.is_mandatory : firmware!.is_mandatory,
                is_approved: input.is_approved !== undefined ? input.is_approved : firmware!.is_approved,
                tested_at: input.tested_at !== undefined ? input.tested_at : firmware!.tested_at,
                note: input.note !== undefined ? input.note : firmware!.note,
                updated_at: new Date(),
            },
        });

        return this.mapPrismaFirmwareToAuthFirmware(updatedFirmware);
    }

    async deleteFirmware(firmwareId: number): Promise<void> {
        const firmware = await this.prisma.firmware!.findUnique({
            where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (!firmware) throwError(ErrorCodes.NOT_FOUND, 'Firmware not found');

        // Check if firmware is in use by devices
        const devices = await this.prisma.devices.findMany({
            where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (devices.length > 0) throwError(ErrorCodes.CONFLICT, 'Cannot delete firmware in use by devices');

        await this.prisma.firmware!.update({
            where: { firmware_id: firmwareId },
            data: { is_deleted: true, updated_at: new Date() },
        });
    }

    async getFirmwareById(firmwareId: number): Promise<Firmware> {
        const firmware = await this.prisma.firmware!.findUnique({
            where: { firmware_id: firmwareId, is_deleted: false },
            include: { device_templates: true },
        });
        if (!firmware) throwError(ErrorCodes.NOT_FOUND, 'Firmware not found');

        return this.mapPrismaFirmwareToAuthFirmware(firmware);
    }

    async getFirmwares(): Promise<Firmware[]> {
        const firmwares = await this.prisma.firmware!.findMany({
            where: { is_deleted: false },
            include: { device_templates: true },
        });

        return firmwares.map((firmware) => this.mapPrismaFirmwareToAuthFirmware(firmware));
    }

    private mapPrismaFirmwareToAuthFirmware(firmware: any): Firmware {
        return {
            firmware_id: firmware!.firmware_id,
            version: firmware!.version,
            file_path: firmware!.file_path,
            template_id: firmware!.template_id ?? null,
            is_mandatory: firmware!.is_mandatory ?? null,
            created_at: firmware!.created_at ?? null,
            tested_at: firmware!.tested_at ?? null,
            is_approved: firmware!.is_approved ?? null,
            updated_at: firmware!.updated_at ?? null,
            is_deleted: firmware!.is_deleted ?? null,
            note: firmware!.note ?? null,
        };
    }
}

export default FirmwareService;