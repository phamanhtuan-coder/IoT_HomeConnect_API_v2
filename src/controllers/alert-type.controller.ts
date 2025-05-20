import { Request, Response, NextFunction } from "express";
import AlertTypeService from "../services/alert-type.service";
import { ErrorCodes, throwError } from "../utils/errors";

class AlertTypeController {
    private alertTypeService: AlertTypeService;

    constructor() {
        this.alertTypeService = new AlertTypeService();
    }

    /**
     * Tạo loại cảnh báo mới
     * @param req Request Express với tên và mức độ ưu tiên của loại cảnh báo trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    createAlertType = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) {
            throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
        }

        const { alert_type_name, priority } = req.body;
        try {
            const alertType = await this.alertTypeService.createAlertType({
                alert_type_name,
                priority,
            });
            res.status(201).json(alertType);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật thông tin loại cảnh báo
     * @param req Request Express với ID loại cảnh báo trong params và thông tin cập nhật trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateAlertType = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) {
            throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
        }

        const { alertTypeId } = req.params;
        const { alert_type_name, priority } = req.body;
        try {
            const alertType = await this.alertTypeService.updateAlertType(
                parseInt(alertTypeId),
                { alert_type_name, priority }
            );
            res.json(alertType);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xóa loại cảnh báo
     * @param req Request Express với ID loại cảnh báo trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    deleteAlertType = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) {
            throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
        }

        const { alertTypeId } = req.params;
        try {
            await this.alertTypeService.deleteAlertType(parseInt(alertTypeId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thông tin loại cảnh báo theo ID
     * @param req Request Express với ID loại cảnh báo trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getAlertTypeById = async (req: Request, res: Response, next: NextFunction) => {
        const { alertTypeId } = req.params;
        try {
            const alertType = await this.alertTypeService.getAlertTypeById(
                parseInt(alertTypeId)
            );
            res.json(alertType);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách tất cả loại cảnh báo
     * @param req Request Express
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getAllAlertTypes = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const alertTypes = await this.alertTypeService.getAllAlertTypes();
            res.json(alertTypes);
        } catch (error) {
            next(error);
        }
    };
}

export default AlertTypeController;

