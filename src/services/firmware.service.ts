import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import {Firmware} from "../types/firmware";
import { validateVersion } from '../utils/helpers';

enum LogType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    TESTER_CONFIRM = 'tester_confirm',
    TEST_FAILED = 'test_failed',
    RD_CONFIRM = 'rd_confirm',
    RD_FAILED = 'rd_failed',
}

class FirmwareService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    private async validateUniqueName(name: string, template_id: number, firmware_id?: number): Promise<{ success: boolean; error?: string }> {
        let whereCondition= {
            name: name,
            template_id: template_id,
            is_deleted: false,
            firmware_id: firmware_id ? { not: firmware_id } : undefined
        }
        
        const existingFirmware = await this.prisma.firmware.findFirst({
            where: whereCondition
        });

        if (existingFirmware) {
            return { 
                success: false, 
                error: `Tên firmware "${name}" đã tồn tại trong template này` 
            };
        }

        return { success: true };
    }

    private async validateVersionIsLatest(normalizedVersion: string, template_id: number): Promise<{ success: boolean; error?: string }> {
        // Tìm firmware mới nhất của template
        const latestFirmware = await this.prisma.firmware.findFirst({
            where: { 
                template_id: template_id,
                is_deleted: false 
            },
            orderBy: { version: 'desc' }
        });
    
        if (!latestFirmware) {
            return { success: true };
        }
    
        if (normalizedVersion > latestFirmware.version) {
            return { success: true };
        }
    
        return { 
            success: false, 
            error: `Version ${normalizedVersion} đã tồn tại hoặc không lớn hơn version hiện tại (${latestFirmware.version})` 
        };
    }

    private async updateFirmwares(template_id: number, firmware_id: number, employee: any): Promise<void> {
        // Tạo log chung để push vào các bản ghi bị cập nhật
        const logForDemotedFirmware = {
            log_type: LogType.UPDATE,
            log_message: 'Firmware không còn là bắt buộc vì có bản mới được gán là bắt buộc',
            employee: employee?.surname + ' ' + employee?.lastname,
            created_at: new Date(),
        };

        // Lấy tất cả firmware cần cập nhật (trừ bản vừa tạo)
        const otherFirmwares = await this.prisma.firmware.findMany({
            where: {
                template_id: template_id,
                is_deleted: false,
                firmware_id: { not: firmware_id },
                is_mandatory: true
            },
        });

        for (const fw of otherFirmwares) {
            await this.prisma.firmware.update({
                where: { firmware_id: fw.firmware_id, is_deleted: false },
                data: {
                    is_mandatory: false,
                    updated_at: new Date(),
                    // logs: [...fw.logs, logForDemotedFirmware]
                },
            });
        }
    }

    async createFirmware(input: {
        version: string;
        name: string;
        file_path: string;
        template_id: number;
        is_mandatory?: boolean;
        note?: string;
    }, employeeId: string): Promise<Firmware> {
        const { version, name, file_path, template_id, is_mandatory, note } = input;

        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId, deleted_at: null },
        });
        if (!employee) throwError(ErrorCodes.NOT_FOUND, 'Nhân viên không tồn tại');

        const template = await this.prisma.device_templates.findUnique({
            where: { template_id: template_id, is_deleted: false },
        });

        if (!template) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy sản phẩm');
        
        // Kiểm tra định dạng version và chuẩn hoá lại version
        const normalizedVersion = validateVersion(version);
        if (!normalizedVersion.success) {
            throwError(ErrorCodes.BAD_REQUEST, normalizedVersion.error!);
        }

        const latestVersionValidation = await this.validateVersionIsLatest(normalizedVersion.normalizedVersion!, template_id);
        if (!latestVersionValidation.success) {
            throwError(ErrorCodes.BAD_REQUEST, latestVersionValidation.error!);
        }

        // Kiểm tra tên firmware
        const nameValidation = await this.validateUniqueName(name, template_id);
        if (!nameValidation.success) {
            throwError(ErrorCodes.BAD_REQUEST, nameValidation.error!);
        }

        const newLog = {
            log_type: LogType.CREATE,
            log_message: note || 'Firmware đã được tạo mới thành công',
            employee: employee?.surname + ' ' + employee?.lastname,
            created_at: new Date(),
        };

        const firmware = await this.prisma.firmware!.create({
            data: {
                version: normalizedVersion.normalizedVersion!,
                name: name,
                file_path: file_path,
                template_id: template_id,
                is_mandatory: is_mandatory,
                note: note || null,
                // logs: [newLog]
            },
        });

        if (is_mandatory) {
            await this.updateFirmwares(template_id, firmware.firmware_id, employee);
        }

        return this.mapPrismaFirmwareToAuthFirmware(firmware);
    }

    async updateFirmware(firmwareId: number, input: {
        version: string;
        name: string;
        file_path: string;
        template_id: number;
        is_mandatory: boolean;
        note?: string;
    }, employeeId: string): Promise<Firmware> {
        const firmware = await this.prisma.firmware!.findUnique({
            where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (!firmware) throwError(ErrorCodes.NOT_FOUND, 'Firmware not found');

        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId, deleted_at: null },
        });
        if (!employee) throwError(ErrorCodes.NOT_FOUND, 'Nhân viên không tồn tại');

        const template = await this.prisma.device_templates.findUnique({
            where: { template_id: input.template_id, is_deleted: false },
        });
        if (!template) throwError(ErrorCodes.NOT_FOUND, 'Device template not found');
        
        // Kiểm tra và chuẩn hoá version
        const normalizedVersion = validateVersion(input.version);
        if (!normalizedVersion.success) {
            throwError(ErrorCodes.BAD_REQUEST, normalizedVersion.error!);
        }

        // Kiểm tra version có lớn hơn version hiện tại không
        if (normalizedVersion.normalizedVersion! < firmware?.version!) {
            throwError(ErrorCodes.BAD_REQUEST, `Version ${normalizedVersion.normalizedVersion!} không lớn hơn version hiện tại (${firmware?.version!})`);
        }

        // và có được sử dụng trong device_templates nào không
        const productionBatches = await this.prisma.production_batches.findFirst({
            where: {
                template_id: input.template_id, is_deleted: false,
                // firmware_id: firmwareId
            },
        });
        if (productionBatches) throwError(ErrorCodes.NOT_FOUND, 'Device template not found');

        // Kiểm tra tên firmware
        const nameValidation = await this.validateUniqueName(input.name, input.template_id, firmwareId);
        if (!nameValidation.success) {
            throwError(ErrorCodes.BAD_REQUEST, nameValidation.error!);
        }

        const updatedFirmware = await this.prisma.firmware.update({
            where: { firmware_id: firmwareId },
            data: {
                version: input.version,
                name: input.name || firmware!.name,
                file_path: input.file_path || firmware!.file_path,
                template_id: input.template_id !== undefined ? input.template_id : firmware!.template_id,
                is_mandatory: input.is_mandatory !== undefined ? input.is_mandatory : firmware!.is_mandatory,
                note: input.note !== undefined ? input.note : firmware!.note,
                updated_at: new Date(),
            },
        });

        if (input.is_mandatory && input.is_mandatory !== firmware!.is_mandatory) {
            await this.updateFirmwares(input.template_id, firmwareId, employee);
        }

        return this.mapPrismaFirmwareToAuthFirmware(updatedFirmware);
    }

    async deleteFirmware(firmwareId: number, employeeId: string): Promise<void> {
        const firmware = await this.prisma.firmware!.findUnique({
            where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (!firmware) throwError(ErrorCodes.NOT_FOUND, 'Firmware not found');

        // Check if firmware is in use by devices
        const devices = await this.prisma.devices.findMany({
            where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (devices.length > 0) throwError(ErrorCodes.CONFLICT, 'Không thể xoá firmware đang được sử dụng bởi các thiết bị');

        const productionBatches = await this.prisma.production_batches.findMany({
            // where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (productionBatches.length > 0) throwError(ErrorCodes.CONFLICT, 'Không thể xoá firmware đang được sử dụng bởi các lô sản phẩm');

        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId, deleted_at: null },
        });
        if (!employee) throwError(ErrorCodes.NOT_FOUND, 'Nhân viên không tồn tại');

        const newLog = {
            log_type: LogType.DELETE,
            log_message: 'Firmware đã được xoá',
            employee_id: employeeId,
            employee: employee?.surname + ' ' + employee?.lastname,
            created_at: new Date(),
        };

        await this.prisma.firmware!.update({
            where: { firmware_id: firmwareId },
            data: {
                is_deleted: true, updated_at: new Date(),
                // logs: [...(firmware?.logs || []), newLog]
            },
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

    async confirmFirmwareByTester(firmwareId: number, employeeId: string, testResult: boolean): Promise<void> {
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId, deleted_at: null },
        });
        if (!employee) throwError(ErrorCodes.NOT_FOUND, 'Nhân viên không tồn tại');

        const firmware = await this.prisma.firmware.findUnique({
            where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (!firmware) throwError(ErrorCodes.NOT_FOUND, 'Firmware not found');
        
        if(firmware?.tested_at) throwError(ErrorCodes.CONFLICT, 'Firmware đã được kiểm tra');

        if(firmware?.is_approved) throwError(ErrorCodes.CONFLICT, 'Firmware đã phê duyệt');

        const newLog = {
            log_type: testResult ? LogType.TESTER_CONFIRM : LogType.TEST_FAILED,
            log_message: 'Firmware đã được xác nhận bởi tester',
            employee_id: employeeId,
            employee: employee?.surname + ' ' + employee?.lastname,
            created_at: new Date(),
        };

        await this.prisma.firmware.update({
            where: { firmware_id: firmwareId },
            data: {
                tested_at: testResult ? new Date() : null,
                // logs: [...(firmware?.logs || []), newLog],
                },
        });
    }

    async confirmFirmwareByRD(firmwareId: number, employeeId: string, testResult: boolean): Promise<void> {
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId, deleted_at: null },
        });
        if (!employee) throwError(ErrorCodes.NOT_FOUND, 'Nhân viên không tồn tại');

        const firmware = await this.prisma.firmware.findUnique({
            where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (!firmware) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy firmware');
        
        if(!firmware?.tested_at) throwError(ErrorCodes.CONFLICT, 'Firmware chưa được kiểm tra');

        if(firmware?.is_approved) throwError(ErrorCodes.CONFLICT, 'Firmware đã phê duyệt');

        const newLog = {
            log_type: testResult ? LogType.RD_CONFIRM : LogType.RD_FAILED,
            log_message: 'Firmware đã được xác nhận bởi RD',
            employee_id: employeeId,
            employee: employee?.surname + ' ' + employee?.lastname,
            created_at: new Date(),
        };

        await this.prisma.firmware.update({
            where: { firmware_id: firmwareId },
            data: {
                tested_at: testResult ? new Date() : null,
                is_approved: testResult ? true : false,
                // logs: [...(firmware?.logs || []), newLog],
                },
        });
    }

    private mapPrismaFirmwareToAuthFirmware(firmware: any): Firmware {
        return {
            firmware_id: firmware!.firmware_id,
            version: firmware!.version,
            name: firmware!.name ?? null,
            file_path: firmware!.file_path,
            template_id: firmware!.template_id ?? null,
            is_mandatory: firmware!.is_mandatory ?? null,
            created_at: firmware!.created_at ?? null,
            tested_at: firmware!.tested_at ?? null,
            is_approved: firmware!.is_approved ?? null,
            updated_at: firmware!.updated_at ?? null,
            is_deleted: firmware!.is_deleted ?? null,
            note: firmware!.note ?? null,
            // logs: firmware!.logs ?? [],
        };
    }
}

export default FirmwareService;
