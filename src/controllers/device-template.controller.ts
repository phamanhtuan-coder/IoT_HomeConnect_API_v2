import { Request, Response, NextFunction } from 'express';
import DeviceTemplateService from '../services/device-template.service';
import { ErrorCodes, throwError } from '../utils/errors';
import {DeviceTemplateCreateInput, DeviceTemplateUpdateInput, DeviceTemplateIdParam, DeviceTemplateListQuery} from "../utils/schemas/device-template.schema";

/**
 * Controller quản lý các thao tác liên quan đến Device Template.
 */
class DeviceTemplateController {
    private deviceTemplateService: DeviceTemplateService;

    /**
     * Khởi tạo một instance của DeviceTemplateController.
     */
    constructor() {
        this.deviceTemplateService = new DeviceTemplateService();
    }

    /**
     * Tạo một Device Template mới.
     * @param {Request} req - Yêu cầu HTTP chứa dữ liệu Device Template.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm middleware tiếp theo.
     */
    createDeviceTemplate = async (req: Request, res: Response, next: NextFunction) => {
        // const employeeId = req.user?.employeeId;
        const employeeId = "admin123";
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const template = await this.deviceTemplateService.createDeviceTemplate(req.body as DeviceTemplateCreateInput, employeeId);
            res.status(201).json(template);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thông tin của một Device Template theo ID.
     * @param {Request} req - Yêu cầu HTTP chứa ID của Device Template.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm middleware tiếp theo.
     */
    getDeviceTemplateById = async (req: Request, res: Response, next: NextFunction) => {
        // const employeeId = req.user?.employeeId;
        const employeeId = "admin123";
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const { templateId } = req.params;
            const template = await this.deviceTemplateService.getDeviceTemplateById(parseInt(templateId));
            res.json(template);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách tất cả các Device Template.
     * @param {Request} req - Yêu cầu HTTP.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm middleware tiếp theo.
     */
    getAllDeviceTemplates = async (req: Request, res: Response, next: NextFunction) => {
        // const employeeId = req.user?.employeeId;
        const employeeId = "admin123";
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');
        try {
            const templates = await this.deviceTemplateService.getAllDeviceTemplates();
            res.json(templates);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật một Device Template theo ID.
     * @param {Request} req - Yêu cầu HTTP chứa ID và dữ liệu cập nhật của Device Template.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm middleware tiếp theo.
     */
    updateDeviceTemplate = async (req: Request, res: Response, next: NextFunction) => {
        // const employeeId = req.user?.employeeId;
        const employeeId = "admin123";
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const { templateId } = req.params;
            const template = await this.deviceTemplateService.updateDeviceTemplate(parseInt(templateId), req.body as DeviceTemplateUpdateInput);
            res.json(template);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xóa một Device Template theo ID.
     * @param {Request} req - Yêu cầu HTTP chứa ID của Device Template.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm middleware tiếp theo.
     */
    deleteDeviceTemplate = async (req: Request, res: Response, next: NextFunction) => {
        // const employeeId = req.user?.employeeId;
        const employeeId = "admin123";
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const { templateId } = req.params;
            await this.deviceTemplateService.deleteDeviceTemplate(parseInt(templateId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}
export default DeviceTemplateController;