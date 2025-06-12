import { Request, Response, NextFunction } from 'express';
import DeviceTemplateService from '../services/device-template.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { DeviceTemplateInput } from "../utils/schemas/device-template.schema";

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
            const template = await this.deviceTemplateService.createDeviceTemplate(req.body as DeviceTemplateInput, employeeId);
            return res.status(201).json({
                status_code: 201,
                message: "Tạo khuôn mẫu thành công",
                data: template,
            });
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
            const template = await this.deviceTemplateService.getDeviceTemplateById(templateId);
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
            const template = await this.deviceTemplateService.updateDeviceTemplate(templateId, req.body);
            return res.status(200).json({
                status_code: 200,
                message: "Câp nhật khuôn mẫu thành công",
                data: template,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật một Device Template theo ID.
     * @param {Request} req - Yêu cầu HTTP chứa ID và trạng thái của Device Template.
     * @param {Response} res - Phản hồi HTTP.
     * @param {NextFunction} next - Hàm middleware tiếp theo.
     */
    approveDeviceTemplate = async (req: Request, res: Response, next: NextFunction) => {
        // const employeeId = req.user?.employeeId;
        const employeeId = "admin123";
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');
        try {
            const { templateId } = req.params;
            console.log("data", templateId + " " + req.body)
            const template = await this.deviceTemplateService.approveDeviceTemplate(templateId, req.body);
            return res.status(200).json({
                status_code: 200,
                message: "Chuyển trạng thái thiết bị thành công",
                data: template,
            });
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
            const template = await this.deviceTemplateService.deleteDeviceTemplate(templateId);
            return res.status(200).json({
                status_code: 204,
                message: "Xóa khuôn mẫu thành công",
                data: template,
            });
        } catch (error) {
            next(error);
        }
    };
}
export default DeviceTemplateController;