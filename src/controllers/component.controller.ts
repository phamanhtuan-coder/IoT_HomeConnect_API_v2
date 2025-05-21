import { Request, Response, NextFunction } from 'express';
import ComponentService from '../services/component.service';
import { ErrorCodes, throwError } from '../utils/errors';

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
            const component = await this.componentService.createComponent(req.body);
            res.status(201).json(component);
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
            const component = await this.componentService.getComponentById(parseInt(componentId));
            res.json(component);
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
            const components = await this.componentService.getAllComponents();
            res.json(components);
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
            const component = await this.componentService.updateComponent(parseInt(componentId), req.body);
            res.json(component);
        } catch (error) {
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
            await this.componentService.deleteComponent(parseInt(componentId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

export default ComponentController;