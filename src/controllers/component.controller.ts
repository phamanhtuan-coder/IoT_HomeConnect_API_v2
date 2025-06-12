import { Request, Response, NextFunction } from 'express';
import ComponentService from '../services/component.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { Component, ComponentResponse } from '../types/component';

/**
 * Controller for managing components.
 * Cung cấp các phương thức để tạo, lấy, cập nhật và xóa các thành phần.
 */
class ComponentController {
    private componentService: ComponentService;

    /**
     * Khởi tạo `ComponentController` với một instance của `ComponentService`.
     */
    constructor() {
        this.componentService = new ComponentService();
    }

    /**
     * Tạo một thành phần mới.
     * @param {Request} req - Yêu cầu HTTP, chứa dữ liệu thành phần trong `req.body`.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm tiếp theo để xử lý lỗi.
     */
    createComponent = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const component: Component = await this.componentService.createComponent(req.body);

            const response: ComponentResponse = {
                success: 201,
                data: component,
                message: 'Tạo linh kiện thành công',
            };

            res.status(201).json(response);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thông tin của một thành phần theo ID.
     * @param {Request} req - Yêu cầu HTTP, chứa `componentId` trong `req.params`.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm tiếp theo để xử lý lỗi.
     */
    getComponentById = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const { componentId } = req.params;
            const component: Component = await this.componentService.getComponentById(componentId);

            const response: ComponentResponse = {
                success: 200,
                data: component,
                message: 'Component retrieved successfully',
            };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách tất cả các thành phần.
     * @param {Request} req - Yêu cầu HTTP.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm tiếp theo để xử lý lỗi.
     */
    getAllComponents = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const components: Component[] = await this.componentService.getAllComponents();

            const response: ComponentResponse = {
                success: 200,
                data: components,
                message: 'Components retrieved successfully',
            };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật thông tin của một thành phần.
     * @param {Request} req - Yêu cầu HTTP, chứa `componentId` trong `req.params` và dữ liệu cập nhật trong `req.body`.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm tiếp theo để xử lý lỗi.
     */
    updateComponent = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const { componentId } = req.params;
            const component: Component = await this.componentService.updateComponent(componentId, req.body);

            console.log("component",component)

            const response: ComponentResponse = {
                success: 200,
                data: component,
                message: 'Cập nhật linh kiện thành công',
            };

            res.status(200).json(response);
        } catch (error) {
            console.log("error",error)
            next(error);
        }
    };

    /**
     * Xóa một thành phần theo ID.
     * @param {Request} req - Yêu cầu HTTP, chứa `componentId` trong `req.params`.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm tiếp theo để xử lý lỗi.
     */
    deleteComponent = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const { componentId } = req.params;
            await this.componentService.deleteComponent(componentId);

            const response: ComponentResponse = {
                success: 204,
                data: null,
                message: 'Xóa linh kiện thành công',
            };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };
}

export default ComponentController;