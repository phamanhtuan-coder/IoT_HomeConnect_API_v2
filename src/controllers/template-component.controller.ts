import { Request, Response, NextFunction } from 'express';
import TemplateComponentService from '../services/template-component.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { TemplateComponentInput } from '../types/template-component';

/**
 * Controller for managing Template Components.
 */
class TemplateComponentController {
    private templateComponentService: TemplateComponentService;

    /**
     * Initializes a new instance of the TemplateComponentController class.
     */
    constructor() {
        this.templateComponentService = new TemplateComponentService();
    }

    /**
     * Tạo một Template Component mới.
     * @param {Request} req - Yêu cầu HTTP chứa dữ liệu Template Component.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm middleware tiếp theo.
     */
    createTemplateComponent = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const templateComponent = await this.templateComponentService.createTemplateComponent(req.body as TemplateComponentInput);
            res.status(201).json(templateComponent);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thông tin Template Component theo ID.
     * @param {Request} req - Yêu cầu HTTP chứa ID của Template Component.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm middleware tiếp theo.
     */
    getTemplateComponentById = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const { templateComponentId } = req.params;
            const templateComponent = await this.templateComponentService.getTemplateComponentById(parseInt(templateComponentId));
            res.json(templateComponent);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách tất cả Template Components.
     * @param {Request} req - Yêu cầu HTTP.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm middleware tiếp theo.
     */
    getAllTemplateComponents = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const templateComponents = await this.templateComponentService.getAllTemplateComponents();
            res.json(templateComponents);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật Template Component theo ID.
     * @param {Request} req - Yêu cầu HTTP chứa ID và dữ liệu cập nhật của Template Component.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm middleware tiếp theo.
     */
    updateTemplateComponent = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const { templateComponentId } = req.params;
            const templateComponent = await this.templateComponentService.updateTemplateComponent(
                parseInt(templateComponentId),
                req.body as Partial<TemplateComponentInput>
            );
            res.json(templateComponent);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xóa Template Component theo ID.
     * @param {Request} req - Yêu cầu HTTP chứa ID của Template Component.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm middleware tiếp theo.
     */
    deleteTemplateComponent = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const { templateComponentId } = req.params;
            await this.templateComponentService.deleteTemplateComponent(parseInt(templateComponentId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}
export default TemplateComponentController;