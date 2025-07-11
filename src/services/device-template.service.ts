import { PrismaClient } from '@prisma/client';
import { ErrorCodes, get_error_response, throwError } from '../utils/errors';
import { DeviceTemplateCreateInput, DeviceTemplateUpdateInput, ApproveDeviceTemplateInput } from "../utils/schemas/device-template.schema";
import { DeviceTemplate } from "../types/device-template";
import { generateTemplateId } from "../utils/helpers";
import { generateUniqueProductSlug } from '../utils/slug.helper';
import { ERROR_CODES } from '../contants/error';
import { STATUS_CODE } from '../contants/status';
import queryHelper from '../utils/query.helper';
import prisma from "../config/database";

class DeviceTemplateService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma;
    }

    async createDeviceTemplate(input: DeviceTemplateCreateInput, createdBy: string): Promise<any> {
        try {
            const { device_type_id, name, production_cost, components } = input;
            let totalComponentCost = 0;

            // Kiểm tra loại thiết bị đã có chưa
            if (device_type_id) {
                const category = await this.prisma.categories.findFirst({
                    where: { category_id: device_type_id },
                });
                if (!category) return get_error_response(ERROR_CODES.DEVICE_NOT_FOUND, STATUS_CODE.NOT_FOUND);
            }

            // Kiểm tra tên đã tồn tại chưa
            const existingTemplate = await queryHelper.queryRaw(
                `SELECT * FROM device_templates WHERE BINARY name = ? AND is_deleted = false LIMIT 1`,
                [name]
            );
            if (existingTemplate.length > 0) return get_error_response(ERROR_CODES.DEVICE_NAME_EXISTED, STATUS_CODE.CONFLICT);

            if (components.length > 0) {
                // Tạo danh sách component_id cần kiểm tra
                const componentIds = components.map(component => component.component_id);

                // Truy vấn bảng components để kiểm tra xem tất cả component_id có tồn tại không
                const existingComponents = await this.prisma.components.findMany({
                    where: {
                        component_id: { in: componentIds },
                    },
                    select: { component_id: true, unit_cost: true },
                });

                // Kiểm tra xem số lượng component tìm thấy có khớp với số lượng component_id không
                const foundComponentIds = existingComponents.map(comp => comp.component_id);
                const missingComponents = componentIds.filter(id => !foundComponentIds.includes(id));
                totalComponentCost = existingComponents.reduce((acc, comp) =>
                    acc + (comp?.unit_cost?.toNumber?.() || 0), 0
                );

                if (missingComponents.length > 0) {
                    return get_error_response(ERROR_CODES.COMPONENT_NOT_FOUND, STATUS_CODE.NOT_FOUND, `Components with IDs ${missingComponents.join(', ')} not found`);
                }
            } else {
                return get_error_response(ERROR_CODES.DEVICE_ID_REQUIRED, STATUS_CODE.BAD_REQUEST);
            }

            // Lấy capabilities từ input
            const { capabilities = [] } = input;

            // Nếu truyền lên là array id, cần lấy key từ DB:
            let baseCapabilities: { id: number; key: string }[] = [];
            if (capabilities.length > 0) {
                if (typeof capabilities[0] === 'number') {
                    // Nếu chỉ truyền id, lấy key từ DB
                    const idArray = capabilities.filter((c: any) => typeof c === 'number');
                    const caps = await this.prisma.device_capabilities.findMany({
                        where: { id: { in: idArray }, is_deleted: false }
                    });
                    baseCapabilities = caps.map(c => ({ id: c.id, key: c.keyword }));
                } else {
                    baseCapabilities = (capabilities as any[]).filter(
                        (c): c is { id: number; key: string } => typeof c === 'object' && c !== null && 'id' in c && 'key' in c
                    );
                }
            }

            let template_id: string;
            let attempts = 0;
            const maxAttempts = 5;
            do {
                template_id = generateTemplateId();
                const idExists = await this.prisma.firmware.findFirst({ where: { template_id: template_id } });
                if (!idExists) break;
                attempts++;
                if (attempts >= maxAttempts) return get_error_response(ERROR_CODES.INTERNAL_SERVER_ERROR, STATUS_CODE.INTERNAL_SERVER_ERROR);
            } while (true);


            const template = await this.prisma.device_templates.create({
                data: {
                    template_id: template_id,
                    device_type_id,
                    name,
                    production_cost: production_cost,
                    created_by: createdBy,
                    created_at: new Date(),
                    updated_at: new Date(),
                    is_deleted: false,
                    base_capabilities: baseCapabilities.length > 0 ? baseCapabilities : undefined, // Lưu vào DB
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

            const slug = await generateUniqueProductSlug(name, this.prisma, template.template_id);

            const newProduct = await this.prisma.product.create({
                data: {
                    id: template.template_id,
                    slug: slug,
                    name: template.name,
                    selling_price: totalComponentCost * (template.production_cost || 0),
                    is_hide: true,
                    status: 0,
                    created_at: new Date(),
                    updated_at: new Date(),
                    deleted_at: null,
                }
            });

            return {
                status_code: STATUS_CODE.CREATED,
                message: "Tạo khuôn mẫu thành công",
                data: this.mapPrismaDeviceTemplateToDeviceTemplate(completeTemplate),
            };
        } catch (error) {
            console.log(error);
            return get_error_response(ERROR_CODES.INTERNAL_SERVER_ERROR, STATUS_CODE.INTERNAL_SERVER_ERROR);
        }
    }

    async getDeviceTemplateById(templateId: string): Promise<DeviceTemplate> {
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

    async updateDeviceTemplate(templateId: string, input: DeviceTemplateUpdateInput): Promise<DeviceTemplate> {
        console.log("data cập nhật template", input);
        const template = await this.prisma.device_templates.findUnique({
            where: { template_id: templateId, is_deleted: false },
        });
        if (!template) throwError(ErrorCodes.TEMPLATE_NOT_FOUND, 'Không tìm thấy thiết bị');

        const { device_type_id, name, production_cost, status, components = [] } = input;

        // Validate device_type_id if provided
        if (device_type_id) {
            const category = await this.prisma.categories.findUnique({
                where: { category_id: device_type_id },
            });
            if (!category) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy loại thiết bị');
        }

        // Check for duplicate name, excluding the current template
        if (name && name !== template?.name) {
            const existingTemplate = await this.prisma.device_templates.findFirst({
                where: {
                    name,
                    is_deleted: false,
                    template_id: { not: templateId },
                },
            });
            if (existingTemplate) throwError(ErrorCodes.TEMPLATE_ALREADY_EXISTS, 'Tên thiết bị đã tồn tại');
        }

        // Validate component IDs
        if (components.length > 0) {
            const componentIds = components
                .map(component => component.component_id)
                .filter((id): id is string => id !== null && id !== undefined);

            if (componentIds.length !== components.length) {
                throwError(ErrorCodes.NOT_FOUND, 'Có ID linh kiện không hợp lệ');
            }

            const existingComponents = await this.prisma.components.findMany({
                where: {
                    component_id: { in: componentIds },
                },
                select: { component_id: true },
            });

            const foundComponentIds = existingComponents
                .map(comp => comp.component_id)
                .filter((id): id is string => id !== null);

            const missingComponents = componentIds.filter(id => !foundComponentIds.includes(id));

            if (missingComponents.length > 0) {
                throwError(ErrorCodes.NOT_FOUND, `Components with IDs ${missingComponents.join(', ')} not found`);
            }
        } else {
            throwError(ErrorCodes.BAD_REQUEST, 'Cần ít nhất 1 loại thiết bị');
        }

        // Update device template
        await this.prisma.device_templates.update({
            where: { template_id: templateId },
            data: {
                device_type_id: device_type_id ?? template?.device_type_id,
                name: name ?? template?.name,
                production_cost: production_cost ?? template?.production_cost,
                updated_at: new Date(),
                status: status ?? template?.status,
            },
        });

        // Handle component updates
        if (components.length > 0) {
            // Fetch all existing template_components (including soft-deleted ones)
            const allTemplateComponents = await this.prisma.template_components.findMany({
                where: { template_id: templateId },
                select: {
                    component_id: true,
                    quantity_required: true,
                    is_deleted: true,
                },
            });

            const existingComponentIds = allTemplateComponents
                .map(tc => tc.component_id)
                .filter((id): id is string => id !== null);
            const newComponentIds = components
                .map(component => component.component_id)
                .filter((id): id is string => id !== null);

            // Identify components to delete (exist in old list but not in new list)
            const componentsToDelete = existingComponentIds.filter(id => !newComponentIds.includes(id));

            // Soft delete components no longer in the list
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

            // Process components: update existing ones and create new ones
            const componentsToCreate: { template_id: string; component_id: string; quantity_required: number; created_at: Date; updated_at: Date; is_deleted: boolean }[] = [];

            await Promise.all(
                components.map(async (component) => {
                    if (component.component_id === null || component.component_id === undefined) {
                        throwError(ErrorCodes.NOT_FOUND, 'Component ID cannot be null or undefined');
                    }

                    const existingComponent = allTemplateComponents.find(
                        tc => tc.component_id === component.component_id
                    );

                    if (existingComponent) {
                        // Update or restore existing component
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
                    } else {
                        // Collect new components to create
                        componentsToCreate.push({
                            template_id: templateId,
                            component_id: component.component_id,
                            quantity_required: component.quantity_required || 1,
                            created_at: new Date(),
                            updated_at: new Date(),
                            is_deleted: false,
                        });
                    }
                })
            );

            // Create new components if any
            if (componentsToCreate.length > 0) {
                await this.prisma.template_components.createMany({
                    data: componentsToCreate,
                });
            }
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

    async approveDeviceTemplate(templateId: string, input: ApproveDeviceTemplateInput): Promise<DeviceTemplate> {
        const template = await this.prisma.device_templates.findUnique({
            where: { template_id: templateId, is_deleted: false },
        });
        if (!template) throwError(ErrorCodes.TEMPLATE_NOT_FOUND, 'Không tìm thấy thiết bị');

        const { status } = input;
        console.log("data", templateId + " " + status)

        // Update the device template
        await this.prisma.device_templates.update({
            where: { template_id: templateId },
            data: {
                updated_at: new Date(),
                status: status ?? template!.status,
            },
        });

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

    async deleteDeviceTemplate(templateId: string): Promise<void> {
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