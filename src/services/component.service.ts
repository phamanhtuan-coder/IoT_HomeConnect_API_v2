import { DataType, PrismaClient } from "@prisma/client";
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
        default_value?: string | null;
        unit?: string | null;
        min?: number | null;
        max?: number | null;
        datatype?: string | null;
        name_display?: string | null;
    }): Promise<Component> {
        let { name, supplier, unit_cost, status, flow_type, default_value, unit, min, max, datatype, name_display } = input;
        
        if (flow_type && !['input', 'output', 'both', 'input_special'].includes(flow_type)) {
            throwError(ErrorCodes.BAD_REQUEST, 'Flow type must be input or output');

            if (datatype && !['STRING', 'NUMBER', 'BOOLEAN'].includes(datatype)) {
                throwError(ErrorCodes.BAD_REQUEST, 'Datatype must be STRING, NUMBER, BOOLEAN');
            }

            if (datatype === 'NUMBER') {
                if (!min || !max) {
                    throwError(ErrorCodes.BAD_REQUEST, 'Giá trị nhỏ nhất hoặc giá trị lớn nhất không được để trống');
                } else if (min && max && min > max) {
                    throwError(ErrorCodes.BAD_REQUEST, 'Giá trị nhỏ nhất không được lớn hơn giá trị lớn nhất');
                } else if (default_value && (isNaN(Number(default_value)) || Number(default_value) < min || Number(default_value) > max)) {
                    throwError(ErrorCodes.BAD_REQUEST, 'Giá trị mặc định không được nhỏ hơn giá trị nhỏ nhất hoặc lớn hơn giá trị lớn nhất');
                }
            }
        } else if (!flow_type) {
            default_value = null;
            unit = null;
            min = null;
            max = null;
            datatype = null;
            name_display = null;
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
                unit,
                default_value,
                min,
                max,
                datatype: datatype as DataType,
                name_display,
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
        default_value?: string;
        unit?: string;
        min?: number;
        max?: number;
        datatype?: string;
        name_display?: string;
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
                flow_type: input.flow_type,
                default_value: input.default_value,
                unit: input.unit,
                min: input.min,
                max: input.max,
                datatype: input.datatype as DataType,
                updated_at: new Date(),
                name_display: input.name_display || null,
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
            default_value: component.default_value,
            unit: component.unit,
            min: component.min,
            max: component.max,
            datatype: component.datatype as DataType,
            name_display: component.name_display,
        };
    }
}

export default ComponentService;