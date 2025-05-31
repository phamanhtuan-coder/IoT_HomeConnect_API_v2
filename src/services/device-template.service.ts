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
        const { device_type_id, name, production_cost, components } = input;

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

        if (components.length > 0) {
            // Tạo danh sách component_id cần kiểm tra
            const componentIds = components.map(component => component.component_id);
    
            // Truy vấn bảng components để kiểm tra xem tất cả component_id có tồn tại không
            const existingComponents = await this.prisma.components.findMany({
                where: {
                    component_id: { in: componentIds },
                },
                select: { component_id: true },
            });
    
            // Kiểm tra xem số lượng component tìm thấy có khớp với số lượng component_id không
            const foundComponentIds = existingComponents.map(comp => comp.component_id);
            const missingComponents = componentIds.filter(id => !foundComponentIds.includes(id));
    
            if (missingComponents.length > 0) {
                throwError(ErrorCodes.NOT_FOUND, `Components with IDs ${missingComponents.join(', ')} not found`);
            }
        }

        const template = await this.prisma.device_templates.create({
            data: {
                device_type_id,
                name,
                production_cost: production_cost,
                created_by: createdBy,
                created_at: new Date(),
                updated_at: new Date(),
                is_deleted: false,
            },
        });

        // Thêm linh kiện vào bảng template_components
        if (components.length > 0) {
            const templateComponentData = components.map(component => ({
                template_id: template.template_id,
                component_id: component.component_id,
                quantity_required: component.quantity_required || 1,
                created_at: new Date(),
                updated_at: new Date(),
                is_deleted: false,
            }));

            await this.prisma.template_components.createMany({
                data: templateComponentData,
            });
        }

        const completeTemplate = await this.prisma.device_templates.findUnique({
            where: { template_id: template.template_id },
            include: {
                categories: { select: { name: true } },
                account: {
                    include: {
                        employee: { select: { surname: true, lastname: true } },
                    },
                },
                template_components: {
                    where: { is_deleted: false },
                    include: {
                        components: {
                            select: {
                                component_id: true,
                                name: true,
                                supplier: true,
                                unit_cost: true,
                                status: true,
                            },
                        },
                    },
                },
                firmware: { where: { is_deleted: false } },
            },
        });

        return this.mapPrismaDeviceTemplateToDeviceTemplate(completeTemplate);
    }

    async getDeviceTemplateById(templateId: number): Promise<DeviceTemplate> {
        const template = await this.prisma.device_templates.findUnique({
            where: { template_id: templateId, is_deleted: false },
            include: {
                categories: {
                    select: {
                        name: true,
                    },
                },
                account: {
                    include: {
                        employee: {
                            select: {
                                surname: true,
                                lastname: true,
                            }
                        }
                    }
                },
                template_components: {
                    where: {
                        is_deleted: false
                    },
                    include: {
                        components: {
                            select: {
                                component_id: true,
                                name: true,
                                supplier: true,
                                unit_cost: true,
                                status: true,
                            },
                        }
                    }
                },
                firmware: {
                    where: {
                        is_deleted: false
                    },
                },
            },
        });
        if (!template) throwError(ErrorCodes.TEMPLATE_NOT_FOUND, 'Device template not found');

        return this.mapPrismaDeviceTemplateToDeviceTemplate(template);
    }

    async getAllDeviceTemplates(): Promise<DeviceTemplate[]> {
        const templates = await this.prisma.device_templates.findMany({
            where: { is_deleted: false },
            include: {
                categories: {
                    select: {
                        name: true,
                    },
                },
                account: {
                    include: {
                        employee: {
                            select: {
                                surname: true,
                                lastname: true,
                            }
                        }
                    }
                },
                template_components: {
                    where: {
                        is_deleted: false
                    },
                    include: {
                        components: {
                            select: {
                                component_id: true,
                                name: true,
                                supplier: true,
                                unit_cost: true,
                                status: true,
                            },
                        }
                    }
                },
                firmware: {
                    where: {
                        is_deleted: false
                    },
                },
            },
        });
        console.log(templates)
        
        return templates.map((template: any) => this.mapPrismaDeviceTemplateToDeviceTemplate(template));
    }

    async updateDeviceTemplate(templateId: number, input: DeviceTemplateInput): Promise<DeviceTemplate> {
        const template = await this.prisma.device_templates.findUnique({
            where: { template_id: templateId, is_deleted: false },
        });
        if (!template) throwError(ErrorCodes.TEMPLATE_NOT_FOUND, 'Device template not found');

        const { device_type_id, name, production_cost, components = [] } = input;

        // Validate device_type_id if provided
        if (device_type_id) {
            const category = await this.prisma.categories.findUnique({
                where: { category_id: device_type_id },
            });
            if (!category) throwError(ErrorCodes.NOT_FOUND, 'Device type not found');
        }

        // Check for duplicate name
        if (name && name !== template!.name) {
            const existingTemplate = await this.prisma.device_templates.findFirst({
                where: { name, is_deleted: false },
            });
            if (existingTemplate) throwError(ErrorCodes.TEMPLATE_ALREADY_EXISTS, 'Template name already exists');
        }

        // Validate component IDs if components are provided
        if (components.length > 0) {
            const componentIds = components
                .map(component => component.component_id)
                .filter((id): id is number => id !== null && id !== undefined); // Loại bỏ null và undefined

            if (componentIds.length !== components.length) {
                throwError(ErrorCodes.NOT_FOUND, 'Some component IDs are invalid (null or undefined)');
            }

            const existingComponents = await this.prisma.components.findMany({
                where: {
                    component_id: { in: componentIds },
                },
                select: { component_id: true },
            });

            const foundComponentIds = existingComponents
                .map(comp => comp.component_id)
                .filter((id): id is number => id !== null);

            const missingComponents = componentIds.filter(id => !foundComponentIds.includes(id));

            if (missingComponents.length > 0) {
                throwError(ErrorCodes.NOT_FOUND, `Components with IDs ${missingComponents.join(', ')} not found`);
            }
        }

        // Update the device template
        await this.prisma.device_templates.update({
            where: { template_id: templateId },
            data: {
                device_type_id: device_type_id ?? template!.device_type_id,
                name: name ?? template!.name,
                production_cost: production_cost ?? template!.production_cost,
                updated_at: new Date(),
            },
        });

        // Handle components update, restoration, or deletion
        if (components.length > 0) {
            // Lấy tất cả template_components (bao gồm cả đã soft delete) để kiểm tra
            const allTemplateComponents = await this.prisma.template_components.findMany({
                where: { template_id: templateId },
                select: {
                    component_id: true,
                    quantity_required: true,
                    is_deleted: true,
                },
            });

            // Tạo danh sách component_id hiện tại (bao gồm cả đã soft delete)
            const existingComponentIds = allTemplateComponents
                .map(tc => tc.component_id)
                .filter((id): id is number => id !== null);
            const newComponentIds = components
                .map(component => component.component_id)
                .filter((id): id is number => id !== null);

            // Tìm các component_id cần xóa (có trong danh sách cũ nhưng không có trong danh sách mới)
            const componentsToDelete = existingComponentIds.filter(id => !newComponentIds.includes(id));

            // Soft delete các component không còn trong danh sách mới
            if (componentsToDelete.length > 0) {
                await this.prisma.template_components.updateMany({
                    where: {
                        template_id: templateId,
                        component_id: { in: componentsToDelete },
                        is_deleted: false,
                    },
                    data: {
                        is_deleted: true,
                        updated_at: new Date(),
                    },
                });
            }

            // Xử lý từng component trong danh sách mới
            await Promise.all(
                components.map(async (component) => {
                    if (component.component_id === null || component.component_id === undefined) {
                        throwError(ErrorCodes.NOT_FOUND, 'Component ID cannot be null or undefined');
                    }

                    const existingComponent = allTemplateComponents.find(
                        tc => tc.component_id === component.component_id
                    );

                    if (existingComponent) {
                        // Nếu component đã tồn tại (dù đã soft delete), khôi phục và cập nhật quantity
                        await this.prisma.template_components.updateMany({
                            where: {
                                template_id: templateId,
                                component_id: component.component_id,
                            },
                            data: {
                                is_deleted: false,
                                quantity_required: component.quantity_required || 1,
                                updated_at: new Date(),
                            },
                        });
                    }
                })
            );
        }

        // Fetch the complete updated template with related data
        const completeUpdatedTemplate = await this.prisma.device_templates.findUnique({
            where: { template_id: templateId },
            include: {
                categories: { select: { name: true } },
                account: {
                    include: {
                        employee: { select: { surname: true, lastname: true } },
                    },
                },
                template_components: {
                    where: { is_deleted: false },
                    include: {
                        components: {
                            select: {
                                component_id: true,
                                name: true,
                                supplier: true,
                                unit_cost: true,
                                status: true,
                            },
                        },
                    },
                },
                firmware: { where: { is_deleted: false } },
            },
        });

        return this.mapPrismaDeviceTemplateToDeviceTemplate(completeUpdatedTemplate);
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
            category_name: template.categories.name,
            name: template.name,
            created_by: template.created_by ?? null,
            created_name: template.account?.employee
                ? `${template.account.employee.surname} ${template.account.employee.lastname}`
                : null,
            created_at: template.created_at ?? null,
            updated_at: template.updated_at ?? null,
            is_deleted: template.is_deleted ?? null,
            status: template.status ?? null,
            production_cost: template.production_cost ?? null,
            device_template_note: template.device_template_note ?? null,
            components: template.template_components?.map((tc: any) => ({
                component_id: tc.components.component_id ?? null,
                name: tc.components.name ?? null,
                supplier: tc.components.supplier ?? null,
                unit_cost: tc.components.unit_cost ?? null,
                quantity_required: tc.quantity_required ?? 1,
                status: tc.components.status,
            })) ?? [],
            firmware: template.firmware ?? [],
        };
    }
}

export default DeviceTemplateService;