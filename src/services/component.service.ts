import { PrismaClient } from "@prisma/client";
import {Component} from "../types/component";
import {ErrorCodes, throwError} from "../utils/errors";
import {generateComponentId, generateCustomerId} from "../utils/helpers";
import prisma from "../config/database";
/**
 * Dịch vụ quản lý các thành phần (components).
 */
class ComponentService {
    private prisma: PrismaClient;

    /**
     * Khởi tạo một instance của `ComponentService`.
     */
    constructor() {
        this.prisma = prisma;
    }

    /**
     * Tạo một thành phần mới.
     * @param {Object} input - Dữ liệu đầu vào để tạo thành phần.
     * @param {string} input.name - Tên của thành phần.
     * @param {string} [input.supplier] - Nhà cung cấp của thành phần (tùy chọn).
     * @param {number} [input.quantity_in_stock] - Số lượng tồn kho (tùy chọn).
     * @param {number} [input.unit_cost] - Giá mỗi đơn vị (tùy chọn).
     * @returns {Promise<Component>} Thành phần vừa được tạo.
     * @throws {Error} Nếu thành phần với tên đã tồn tại.
     */
    async createComponent(input: {
        name: string;
        supplier?: string;
        unit_cost?: number;
        status?: boolean;
        flow_type?: string;
        value?: string;
        unit?: string;
    }): Promise<Component> {
        const { name, supplier, unit_cost, status, flow_type, value, unit } = input;
        
        if(flow_type && !['input', 'output', 'both', 'input_special'].includes(flow_type)) {
            throwError(ErrorCodes.BAD_REQUEST, 'Flow type must be input or output');
        }

        const existingComponent = await this.prisma.components.findFirst({
            where: { name, is_deleted: false },
        });
        if (existingComponent) {
            throwError(ErrorCodes.CONFLICT, 'Component with this name already exists');
        }

        let componentId: string;
        let attempts = 0;
        const maxAttempts = 5;
        do {
            componentId = generateComponentId();
            const idExists = await this.prisma.components.findFirst({ where: { component_id: componentId } });
            if (!idExists) break;
            attempts++;
            if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique ID');
        } while (true);

        const component = await this.prisma.components.create({
            data: {
                component_id: componentId,
                name,
                supplier,
                unit_cost,
                status,
                flow_type,
                value,
                unit,
            },
        });

        return this.mapPrismaComponentToComponent(component);
    }

    /**
     * Lấy thông tin của một thành phần dựa trên ID.
     * @param {number} componentId - ID của thành phần.
     * @returns {Promise<Component>} Thành phần tương ứng với ID.
     * @throws {Error} Nếu không tìm thấy thành phần.
     */
    async getComponentById(componentId: string): Promise<Component> {
        const component = await this.prisma.components.findUnique({
            where: { component_id: componentId, is_deleted: false },
        });
        if (!component) {
            throwError(ErrorCodes.NOT_FOUND, 'Component not found');
        }

        return this.mapPrismaComponentToComponent(component);
    }

    /**
     * Lấy danh sách tất cả các thành phần chưa bị xóa.
     * @returns {Promise<Component[]>} Danh sách các thành phần.
     */
    async getAllComponents(): Promise<Component[]> {
        const components = await this.prisma.components.findMany({
            where: { is_deleted: false },
        });

        return components.map((component) => this.mapPrismaComponentToComponent(component));
    }

    /**
     * Cập nhật thông tin của một thành phần.
     * @param {number} componentId - ID của thành phần cần cập nhật.
     * @param {Object} input - Dữ liệu cập nhật.
     * @param {string} [input.name] - Tên mới của thành phần (tùy chọn).
     * @param {string|null} [input.supplier] - Nhà cung cấp mới (tùy chọn).
     * @param {number} [input.unit_cost] - Giá mỗi đơn vị mới (tùy chọn).
     * @returns {Promise<Component>} Thành phần sau khi được cập nhật.
     * @throws {Error} Nếu không tìm thấy thành phần hoặc tên đã tồn tại.
     */
    async updateComponent(componentId: string, input: {
        name?: string;
        supplier?: string | null;
        unit_cost?: number;
        status?: boolean | null;
        flow_type?: string;
        value?: string;
        unit?: string;
    }): Promise<Component> {
        const component = await this.prisma.components.findUnique({
            where: { component_id: componentId, is_deleted: false },
        });
        if (!component) {
            throwError(ErrorCodes.NOT_FOUND, 'Component not found');
        }

        if (input.name) {
            const existingComponent = await this.prisma.components.findFirst({
                where: { name: input.name, is_deleted: false, NOT: { component_id: componentId } },
            });
            if (existingComponent) {
                throwError(ErrorCodes.CONFLICT, 'Component with this name already exists');
            }
        }

        const updatedComponent = await this.prisma.components.update({
            where: { component_id: componentId },
            data: {
                name: input.name,
                supplier: input.supplier,
                unit_cost: input.unit_cost,
                status: input.status,
                updated_at: new Date(),
            },
        });

        return this.mapPrismaComponentToComponent(updatedComponent);
    }

    /**
     * Xóa một thành phần (đánh dấu là đã xóa).
     * @param {number} componentId - ID của thành phần cần xóa.
     * @returns {Promise<void>} Không trả về giá trị.
     * @throws {Error} Nếu không tìm thấy thành phần.
     */
    async deleteComponent(componentId: string): Promise<void> {
        const component = await this.prisma.components.findUnique({
            where: { component_id: componentId, is_deleted: false },
        });
        if (!component) {
            throwError(ErrorCodes.NOT_FOUND, 'Component not found');
        }

        await this.prisma.components.update({
            where: { component_id: componentId },
            data: { is_deleted: true, updated_at: new Date() },
        });
    }

    /**
     * Chuyển đổi dữ liệu từ Prisma thành đối tượng `Component`.
     * @param {any} component - Dữ liệu thành phần từ Prisma.
     * @returns {Component} Đối tượng `Component`.
     */
    private mapPrismaComponentToComponent(component: any): Component {
        return {
            component_id: component.component_id,
            name: component.name,
            supplier: component.supplier,
            unit_cost: component.unit_cost,
            created_at: component.created_at,
            updated_at: component.updated_at,
            is_deleted: component.is_deleted,
            status: component.status,
            flow_type: component.flow_type,
            value: component.value,
            unit: component.unit,
        };
    }
}

export default ComponentService;