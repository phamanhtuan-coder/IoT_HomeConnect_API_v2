import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import {DeviceTemplateInput} from "../utils/schemas/device-template.schema";
import {DeviceTemplate} from "../types/device-template";

class DeviceTemplateService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createDeviceTemplate(input: DeviceTemplateInput, createdBy: string): Promise<DeviceTemplate> {
        const { device_type_id, name } = input;

        // Validate device_type_id if provided
        if (device_type_id) {
            const category = await this.prisma.categories.findUnique({
                where: { category_id: device_type_id},
            });
            if (!category) throwError(ErrorCodes.NOT_FOUND, 'Device type not found');
        }

        // Check for existing template name
        const existingTemplate = await this.prisma.device_templates.findFirst({
            where: { name, is_deleted: false },
        });
        if (existingTemplate) throwError(ErrorCodes.TEMPLATE_ALREADY_EXISTS, 'Template name already exists');

        const template = await this.prisma.device_templates.create({
            data: {
                device_type_id,
                name,
                created_by: createdBy,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });

        return this.mapPrismaDeviceTemplateToDeviceTemplate(template);
    }

    async getDeviceTemplateById(templateId: number): Promise<DeviceTemplate> {
        const template = await this.prisma.device_templates.findUnique({
            where: { template_id: templateId, is_deleted: false },
        });
        if (!template) throwError(ErrorCodes.TEMPLATE_NOT_FOUND, 'Device template not found');

        return this.mapPrismaDeviceTemplateToDeviceTemplate(template);
    }

    async getAllDeviceTemplates(): Promise<DeviceTemplate[]> {
        const templates = await this.prisma.device_templates.findMany({
            where: { is_deleted: false },
        });

        return templates.map((template) => this.mapPrismaDeviceTemplateToDeviceTemplate(template));
    }

    async updateDeviceTemplate(templateId: number, input: DeviceTemplateInput): Promise<DeviceTemplate> {
        const template = await this.prisma.device_templates.findUnique({
            where: { template_id: templateId, is_deleted: false },
        });
        if (!template) throwError(ErrorCodes.TEMPLATE_NOT_FOUND, 'Device template not found');

        // Validate device_type_id if provided
        if (input.device_type_id) {
            const category = await this.prisma.categories.findUnique({
                where: { category_id: input.device_type_id},
            });
            if (!category) throwError(ErrorCodes.NOT_FOUND, 'Device type not found');
        }

        // Check for duplicate name
        if (input.name && input.name !== template!.name) {
            const existingTemplate = await this.prisma.device_templates.findFirst({
                where: { name: input.name, is_deleted: false },
            });
            if (existingTemplate) throwError(ErrorCodes.TEMPLATE_ALREADY_EXISTS, 'Template name already exists');
        }

        const updatedTemplate = await this.prisma.device_templates.update({
            where: { template_id: templateId },
            data: {
                device_type_id: input.device_type_id,
                name: input.name,
                updated_at: new Date(),
            },
        });

        return this.mapPrismaDeviceTemplateToDeviceTemplate(updatedTemplate);
    }

    async deleteDeviceTemplate(templateId: number): Promise<void> {
        const template = await this.prisma.device_templates.findUnique({
            where: { template_id: templateId, is_deleted: false },
        });
        if (!template) throwError(ErrorCodes.TEMPLATE_NOT_FOUND, 'Device template not found');

        await this.prisma.device_templates.update({
            where: { template_id: templateId },
            data: { is_deleted: true, updated_at: new Date() },
        });
    }

    private mapPrismaDeviceTemplateToDeviceTemplate(template: any): DeviceTemplate {
        return {
            template_id: template.template_id,
            device_type_id: template.device_type_id ?? null,
            name: template.name,
            created_by: template.created_by ?? null,
            created_at: template.created_at ?? null,
            updated_at: template.updated_at ?? null,
            is_deleted: template.is_deleted ?? null,
        };
    }
}

export default DeviceTemplateService;