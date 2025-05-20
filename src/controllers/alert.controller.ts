import { Request, Response, NextFunction } from "express";
import AlertService from "../services/alert.service";
import { ErrorCodes, throwError } from "../utils/errors";

class AlertController {
    private alertService: AlertService;

    constructor() {
        this.alertService = new AlertService();
    }

    /**
     * Tạo cảnh báo mới
     * @param req Request Express với thông tin cảnh báo trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    createAlert = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) {
            throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
        }

        const { device_serial, space_id, message, alert_type_id, status } = req.body;
        try {
            const device = device_serial
                ? {
                    serial_number: device_serial,
                    space_id,
                    account_id: req.user?.employeeId || null,
                }
                : null;
            const alert = await this.alertService.createAlert(
                device as any,
                alert_type_id,
                message || "Manual alert"
            );
            res.status(201).json(alert);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật thông tin cảnh báo
     * @param req Request Express với ID cảnh báo trong params và nội dung cập nhật trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateAlert = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) {
            throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
        }

        const { alertId } = req.params;
        const { message, status } = req.body;
        try {
            const alert = await this.alertService.updateAlert(parseInt(alertId), {
                message,
                status,
            });
            res.json(alert);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xóa mềm cảnh báo
     * @param req Request Express với ID cảnh báo trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    softDeleteAlert = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) {
            throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
        }

        const { alertId } = req.params;
        try {
            await this.alertService.softDeleteAlert(parseInt(alertId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xóa vĩnh viễn cảnh báo
     * @param req Request Express với ID cảnh báo trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    hardDeleteAlert = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) {
            throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
        }

        const { alertId } = req.params;
        try {
            await this.alertService.hardDeleteAlert(parseInt(alertId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thông tin cảnh báo theo ID
     * @param req Request Express với ID cảnh báo trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getAlertById = async (req: Request, res: Response, next: NextFunction) => {
        const { alertId } = req.params;
        try {
            const alert = await this.alertService.getAlertById(parseInt(alertId));
            res.json(alert);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách tất cả cảnh báo
     * @param req Request Express
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getAllAlerts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const alerts = await this.alertService.getAllAlerts();
            res.json(alerts);
        } catch (error) {
            next(error);
        }
    };
}

export default AlertController;

