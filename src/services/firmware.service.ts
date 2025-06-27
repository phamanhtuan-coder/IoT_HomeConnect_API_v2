import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { Firmware } from "../types/firmware";
import {generateEmployeeId, generateFirmwareId, validateVersion} from '../utils/helpers';
import prisma from "../config/database";

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
        this.prisma = prisma
    }

    private async validateUniqueName(name: string, template_id: string, firmware_id?: string): Promise<{ success: boolean; error?: string }> {
        let whereCondition = {
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

    private async validateVersionIsLatest(normalizedVersion: string, template_id: string): Promise<{ success: boolean; error?: string }> {
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

    private async updateFirmwares(template_id: string, firmware_id: string, employee: any): Promise<void> {
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
                    logs: [...((fw.logs as any) || []), logForDemotedFirmware]
                },
            });
        }
    }

    async createFirmware(input: {
        version: string;
        name: string;
        file_path: string;
        template_id: string;
        is_mandatory?: boolean;
        note?: string;
    }, employeeId: string): Promise<any> {
        const { version, name, file_path, template_id, is_mandatory, note } = input;

        const account = await this.prisma.account.findFirst({
            where: { 
                account_id: employeeId, 
                deleted_at: null 
            },
            include: {
                employee: {
                    select: {
                        surname: true,
                        lastname: true,
                    }
                }
            }
        });
        if (!account) throwError(ErrorCodes.NOT_FOUND, 'Nhân viên không tồn tại');

        const template = await this.prisma.device_templates.findFirst({
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
            employee: account?.employee?.surname + ' ' + account?.employee?.lastname,
            created_at: new Date(),
        };

        let firmwareId: string;
        let attempts = 0;
        const maxAttempts = 5;
        do {
            firmwareId = generateFirmwareId();
            const idExists = await this.prisma.firmware.findFirst({ where: { firmware_id: firmwareId }});
            if (!idExists) break;
            attempts++;
            if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique ID');
        } while (true);

        const firmware = await this.prisma.firmware!.create({
            data: {
                firmware_id: firmwareId,
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
            await this.updateFirmwares(template_id, firmware.firmware_id, account);
        }

        return {
            success: true,
            data: firmware
        };
    }

    async updateFirmware(firmwareId: string, input: {
        version: string;
        name: string;
        // file_path: string;
        template_id: string;
        is_mandatory: boolean;
        note?: string;
    }, employeeId: string): Promise<any> {
        const firmware = await this.prisma.firmware!.findFirst({
            where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (!firmware) throwError(ErrorCodes.NOT_FOUND, 'Firmware not found');

        const account = await this.prisma.account.findFirst({
            where: { account_id: employeeId, deleted_at: null },
        });
        if (!account) throwError(ErrorCodes.NOT_FOUND, 'Nhân viên không tồn tại');

        const template = await this.prisma.device_templates.findFirst({
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

        if (productionBatches) throwError(ErrorCodes.NOT_FOUND, 'Có lô hàng đang sử dụng firmware này, không thể cập nhật');

        // Kiểm tra tên firmware
        const nameValidation = await this.validateUniqueName(input.name, input.template_id, firmwareId);
        if (!nameValidation.success) {
            throwError(ErrorCodes.BAD_REQUEST, nameValidation.error!);
        }

        const updatedFirmware = await this.prisma.firmware.update({
            where: { firmware_id: firmwareId },
            data: {
                version: normalizedVersion.normalizedVersion!,
                name: input.name || firmware!.name,
                // file_path: input.file_path || firmware!.file_path,
                template_id: input.template_id !== undefined ? input.template_id : firmware!.template_id,
                is_mandatory: Boolean(input.is_mandatory),
                note: input.note !== undefined ? input.note : firmware!.note,
                updated_at: new Date(),
                tested_at: null,
                is_approved: null,
            },
        });

        if (input.is_mandatory && input.is_mandatory !== firmware!.is_mandatory) {
            await this.updateFirmwares(input.template_id, firmwareId, account);
        }

            return {
                success: true,
                data: updatedFirmware
            };
    }

    async deleteFirmware(firmwareId: string, employeeId: string): Promise<any> {
        const firmware = await this.prisma.firmware!.findFirst({
            where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (!firmware) throwError(ErrorCodes.NOT_FOUND, 'Firmware not found');

        if (firmware?.is_mandatory) throwError(ErrorCodes.CONFLICT, 'Không thể xoá firmware bắt buộc');

        // Check if firmware is in use by devices
        const devices = await this.prisma.devices.findMany({
            where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (devices.length > 0) throwError(ErrorCodes.CONFLICT, 'Không thể xoá firmware đang được sử dụng bởi các thiết bị');

        const productionBatches = await this.prisma.production_batches.findFirst({
            where: { firmware_id: firmwareId, is_deleted: false, status: 'completed' },
        });
        if (productionBatches) throwError(ErrorCodes.CONFLICT, 'Không thể xoá firmware đang được sử dụng bởi các lô sản phẩm');

        const account = await this.prisma.account.findFirst({
            where: { 
                account_id: employeeId, 
                deleted_at: null 
            },
            include: {
                employee: {
                    select: {
                        surname: true,
                        lastname: true,
                    }
                }
            }
        });
        if (!account) throwError(ErrorCodes.NOT_FOUND, 'Nhân viên không tồn tại');

        const newLog = {
            log_type: LogType.DELETE,
            log_message: 'Firmware đã được xoá',
            employee_id: employeeId,
            employee: account?.employee?.surname + ' ' + account?.employee?.lastname,
            created_at: new Date(),
        };

        await this.prisma.firmware!.update({
            where: { firmware_id: firmwareId },
            data: {
                is_deleted: true, updated_at: new Date(),
                logs: [ ...(Array.isArray(firmware?.logs) ? firmware.logs : []), newLog ]
            },
        });

        return {
            success: true
        };
    }

    async getFirmwareById(firmwareId:string): Promise<any> {
        const firmwares = await this.prisma.$queryRaw<any[]>`
            SELECT 
                f.firmware_id, f.version, f.name, f.file_path, f.template_id, f.is_mandatory,
                f.created_at, f.updated_at, f.is_deleted, f.tested_at, f.is_approved, f.note, f.logs,
                CONCAT(
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(f.version, '.', 1), '.', -1) + 0 AS CHAR), '.',
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(f.version, '.', 2), '.', -1) + 0 AS CHAR), '.',
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(f.version, '.', 3), '.', -1) + 0 AS CHAR)
                ) AS version, 
                dt.template_id, dt.name AS template_name, dt.is_deleted AS template_is_deleted
            FROM firmware f
            JOIN device_templates dt ON f.template_id = dt.template_id
            WHERE f.is_deleted = false AND f.firmware_id = ${firmwareId}
        `;

        return {
            success: true,
            data: firmwares[0]
        }
    }

    async getLatestVersionFirmwaresByTemplate(): Promise<any> {
        const template = await this.prisma.$queryRaw<any[]>`
            SELECT 
                dt.template_id AS id,
                dt.name AS template_name,
                CONCAT(
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(fw.lastest_version, '.', 1), '.', -1) + 0 AS CHAR), '.',
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(fw.lastest_version, '.', 2), '.', -1) + 0 AS CHAR), '.',
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(fw.lastest_version, '.', 3), '.', -1) + 0 AS CHAR)
                ) AS lastest_version,
                pb.total_devices
            FROM device_templates dt
            LEFT JOIN (
                SELECT 
                    template_id, 
                    MAX(version) AS lastest_version
                FROM firmware
                WHERE is_deleted = FALSE
                GROUP BY template_id
            ) fw ON dt.template_id = fw.template_id
            LEFT JOIN ( 
                SELECT 
                    template_id,
                    SUM(quantity) AS total_devices
                FROM production_batches
                WHERE is_deleted = FALSE
                GROUP BY template_id
            ) pb ON pb.template_id = dt.template_id
        `;

        return {
            success: true,
            data: template
        }
    }

    async getFirmwares(): Promise<any> {
        const firmwares = await this.prisma.$queryRaw<any[]>`
            SELECT 
                f.firmware_id, f.version, f.name, f.file_path, f.template_id, f.is_mandatory,
                f.created_at, f.updated_at, f.is_deleted, f.tested_at, f.is_approved, f.note, f.logs,
                CONCAT(
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(f.version, '.', 1), '.', -1) + 0 AS CHAR), '.',
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(f.version, '.', 2), '.', -1) + 0 AS CHAR), '.',
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(f.version, '.', 3), '.', -1) + 0 AS CHAR)
                ) AS version, 
                dt.template_id, dt.name AS template_name, dt.is_deleted AS template_is_deleted
            FROM firmware f
            JOIN device_templates dt ON f.template_id = dt.template_id
            WHERE f.is_deleted = false
        `;

        return {
            success: true,
            data: firmwares
        }
    }

    async getFirmwaresByTemplateId(templateId: String): Promise<any> {
        const firmwares = await this.prisma.$queryRaw`
            SELECT 
                f.firmware_id, f.version, f.name, f.file_path, f.template_id, f.is_mandatory,
                f.created_at, f.updated_at, f.is_deleted, f.tested_at, f.is_approved, f.note, f.logs,
                CONCAT(
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(f.version, '.', 1), '.', -1) + 0 AS CHAR), '.',
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(f.version, '.', 2), '.', -1) + 0 AS CHAR), '.',
                    CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(f.version, '.', 3), '.', -1) + 0 AS CHAR)
                ) AS version, 
                dt.template_id, dt.name AS template_name, dt.is_deleted AS template_is_deleted
            FROM firmware f
            JOIN device_templates dt ON f.template_id = dt.template_id
            WHERE f.is_deleted = false AND f.template_id = ${templateId}
            ORDER BY f.version DESC
        `;

        return {
            success: true,
            data: firmwares
        };
    }

    async confirmFirmwareByTester(firmwareId: string, employeeId: string, testResult: boolean): Promise<any> {
        const account = await this.prisma.account.findFirst({
            where: { account_id: employeeId, deleted_at: null },
            include: {
                employee: {
                    select: {
                        surname: true,
                        lastname: true,
                    }
                }
            }
        });
        if (!account) throwError(ErrorCodes.NOT_FOUND, 'Nhân viên không tồn tại');

        const firmware = await this.prisma.firmware.findUnique({
            where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (!firmware) throwError(ErrorCodes.NOT_FOUND, 'Firmware not found');

        if (firmware?.tested_at) throwError(ErrorCodes.CONFLICT, 'Firmware đã được kiểm thử mã nguồn');

        if (firmware?.is_approved) throwError(ErrorCodes.CONFLICT, 'Firmware đã phê duyệt bởi R&D');

        const newLog = {
            log_type: testResult ? LogType.TESTER_CONFIRM : LogType.TEST_FAILED,
            log_message: 'Firmware đã được xác nhận bởi tester',
            employee_id: employeeId,
            employee: account?.employee?.surname + ' ' + account?.employee?.lastname,
            created_at: new Date(),
        };

        await this.prisma.firmware.update({
            where: { firmware_id: firmwareId },
            data: {
                tested_at: testResult ? new Date() : null,
                logs: [ ...(Array.isArray(firmware?.logs) ? firmware.logs : []), newLog ]
                },
        });

        return {
            success: true,
            message: 'Firmware đã được xác nhận bởi tester'
        }
    }

    async confirmFirmwareByRD(firmwareId: string, employeeId: string, testResult: boolean): Promise<any> {
        const account = await this.prisma.account.findFirst({
            where: { account_id: employeeId, deleted_at: null },
            include: {
                employee: {
                    select: {
                        surname: true,
                        lastname: true,
                    }
                }
            }
        });
        if (!account) throwError(ErrorCodes.NOT_FOUND, 'Nhân viên không tồn tại');

        const firmware = await this.prisma.firmware.findUnique({
            where: { firmware_id: firmwareId, is_deleted: false },
        });
        if (!firmware) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy firmware');

        if (!firmware?.tested_at) throwError(ErrorCodes.CONFLICT, 'Firmware chưa được kiểm tra');

        if (firmware?.is_approved) throwError(ErrorCodes.CONFLICT, 'Firmware đã phê duyệt');

        const newLog = {
            log_type: testResult ? LogType.RD_CONFIRM : LogType.RD_FAILED,
            log_message: 'Firmware đã được xác nhận bởi RD',
            employee_id: employeeId,
            employee: account?.employee?.surname + ' ' + account?.employee?.lastname,
            created_at: new Date(),
        };

        await this.prisma.firmware.update({
            where: { firmware_id: firmwareId },
            data: {
                tested_at: testResult ? new Date() : null,
                is_approved: testResult ? true : false,
                logs: [...(firmware?.logs as any), newLog],
                },
        });

        return {
            success: true,
            message: 'Firmware đã được xác nhận bởi RD'
        }
    }
}

export default FirmwareService;


