import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { TemplateComponent, TemplateComponentInput } from '../types/template-component';
import prisma from "../config/database";

/**
 * Dịch vụ quản lý TemplateComponent.
 * Cung cấp các phương thức để tạo, truy xuất, cập nhật và xóa các TemplateComponent.
 */
class TemplateComponentService {
    private prisma: PrismaClient;

    /**
     * Khởi tạo một instance của TemplateComponentService.
     */
    constructor() {
        this.prisma = prisma
    }

    /**
     * Tạo một TemplateComponent mới.
     * @param {TemplateComponentInput} input - Dữ liệu đầu vào để tạo TemplateComponent.
     * @returns {Promise<TemplateComponent>} - TemplateComponent vừa được tạo.
     * @throws {Error} - Nếu template hoặc component không tồn tại, hoặc cặp template-component đã tồn tại.
     */
    async createTemplateComponent(input: TemplateComponentInput): Promise<TemplateComponent> {
        const { template_id, component_id, quantity_required } = input;

        // Kiểm tra sự tồn tại của template
        const template = await this.prisma.device_templates.findUnique({
            where: { template_id, is_deleted: false },
        });
        if (!template) throwError(ErrorCodes.NOT_FOUND, 'Device template not found');

        // Kiểm tra sự tồn tại của component
        const component = await this.prisma.components.findUnique({
            where: { component_id, is_deleted: false },
        });
        if (!component) throwError(ErrorCodes.NOT_FOUND, 'Component not found');

        // Kiểm tra cặp template-component đã tồn tại chưa
        const existing = await this.prisma.template_components.findFirst({
            where: { template_id, component_id, is_deleted: false },
        });
        if (existing) throwError(ErrorCodes.TEMPLATE_COMPONENT_ALREADY_EXISTS, 'Template component already exists');

        const templateComponent = await this.prisma.template_components.create({
            data: {
                template_id,
                component_id,
                quantity_required,
            },
        });

        return this.mapPrismaTemplateComponentToAuthTemplateComponent(templateComponent);
    }

    /**
     * Lấy thông tin TemplateComponent theo ID.
     * @param {number} templateComponentId - ID của TemplateComponent.
     * @returns {Promise<TemplateComponent>} - TemplateComponent tương ứng.
     * @throws {Error} - Nếu TemplateComponent không tồn tại.
     */
    async getTemplateComponentById(templateComponentId: number): Promise<TemplateComponent> {
        const templateComponent = await this.prisma.template_components.findUnique({
            where: { template_component_id: templateComponentId, is_deleted: false },
        });
        if (!templateComponent) throwError(ErrorCodes.TEMPLATE_COMPONENT_NOT_FOUND, 'Template component not found');

        return this.mapPrismaTemplateComponentToAuthTemplateComponent(templateComponent);
    }

    /**
     * Lấy danh sách tất cả TemplateComponent.
     * @returns {Promise<TemplateComponent[]>} - Danh sách các TemplateComponent.
     */
    async getAllTemplateComponents(): Promise<TemplateComponent[]> {
        const templateComponents = await this.prisma.template_components.findMany({
            where: { is_deleted: false },
            include: { device_templates: true, components: true },
        });

        return templateComponents.map((tc) => this.mapPrismaTemplateComponentToAuthTemplateComponent(tc));
    }

    /**
     * Cập nhật thông tin của một TemplateComponent.
     * @param {number} templateComponentId - ID của TemplateComponent cần cập nhật.
     * @param {Partial<TemplateComponentInput>} input - Dữ liệu cần cập nhật.
     * @returns {Promise<TemplateComponent>} - TemplateComponent sau khi được cập nhật.
     * @throws {Error} - Nếu TemplateComponent không tồn tại hoặc dữ liệu không hợp lệ.
     */
    async updateTemplateComponent(templateComponentId: number, input: Partial<TemplateComponentInput>): Promise<TemplateComponent> {
        const templateComponent = await this.prisma.template_components.findUnique({
            where: { template_component_id: templateComponentId, is_deleted: false },
        });
        if (!templateComponent) throwError(ErrorCodes.TEMPLATE_COMPONENT_NOT_FOUND, 'Template component not found');

        // Xác thực template_id và component_id nếu được cung cấp
        if (input.template_id) {
            const template = await this.prisma.device_templates.findUnique({
                where: { template_id: input.template_id, is_deleted: false },
            });
            if (!template) throwError(ErrorCodes.NOT_FOUND, 'Device template not found');
        }
        if (input.component_id) {
            const component = await this.prisma.components.findUnique({
                where: { component_id: input.component_id, is_deleted: false },
            });
            if (!component) throwError(ErrorCodes.NOT_FOUND, 'Component not found');
        }

        const updatedTemplateComponent = await this.prisma.template_components.update({
            where: { template_component_id: templateComponentId },
            data: {
                template_id: input.template_id,
                component_id: input.component_id,
                quantity_required: input.quantity_required,
                updated_at: new Date(),
            },
        });

        return this.mapPrismaTemplateComponentToAuthTemplateComponent(updatedTemplateComponent);
    }

    /**
     * Xóa một TemplateComponent (đánh dấu là đã xóa).
     * @param {number} templateComponentId - ID của TemplateComponent cần xóa.
     * @returns {Promise<void>} - Không trả về giá trị.
     * @throws {Error} - Nếu TemplateComponent không tồn tại.
     */
    async deleteTemplateComponent(templateComponentId: number): Promise<void> {
        const templateComponent = await this.prisma.template_components.findUnique({
            where: { template_component_id: templateComponentId, is_deleted: false },
        });
        if (!templateComponent) throwError(ErrorCodes.TEMPLATE_COMPONENT_NOT_FOUND, 'Template component not found');

        await this.prisma.template_components.update({
            where: { template_component_id: templateComponentId },
            data: { is_deleted: true, updated_at: new Date() },
        });
    }

    /**
     * Chuyển đổi dữ liệu từ Prisma sang định dạng TemplateComponent.
     * @param {any} tc - Dữ liệu TemplateComponent từ Prisma.
     * @returns {TemplateComponent} - Dữ liệu TemplateComponent đã được chuyển đổi.
     */
    private mapPrismaTemplateComponentToAuthTemplateComponent(tc: any): TemplateComponent {
        return {
            template_component_id: tc.template_component_id,
            template_id: tc.template_id,
            component_id: tc.component_id,
            quantity_required: tc.quantity_required,
            created_at: tc.created_at,
            updated_at: tc.updated_at,
            is_deleted: tc.is_deleted,
        };
    }
}
export default TemplateComponentService;