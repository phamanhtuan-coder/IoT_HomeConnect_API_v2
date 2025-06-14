// src/controllers/notification.controller.ts
import { Request, Response, NextFunction } from 'express';
import NotificationService from '../services/notification.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { NotificationType } from '../types/notification';

class NotificationController {
    private notificationService: NotificationService;

    constructor() {
        this.notificationService = new NotificationService();
    }

    /**
     * Tạo thông báo mới
     * @param req Request Express với thông tin thông báo trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    createNotification = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        const { account_id, role_id, text, type, is_read } = req.body;
        try {
            const notification = await this.notificationService.createNotification({
                account_id,
                role_id,
                text,
                type,
                is_read,
            });
            res.status(201).json(notification);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật thông tin thông báo
     * @param req Request Express với ID thông báo trong params và trạng thái đọc trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateNotification = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        const { id } = req.params;
        const { is_read } = req.body;
        try {
            const notification = await this.notificationService.updateNotification(parseInt(id), { is_read });
            res.json(notification);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xóa thông báo
     * @param req Request Express với ID thông báo trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        const { id } = req.params;
        try {
            await this.notificationService.softDeleteNotification(parseInt(id));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thông tin thông báo theo ID
     * @param req Request Express với ID thông báo trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getNotificationById = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        const { id } = req.params;
        try {
            const notification = await this.notificationService.getNotificationById(parseInt(id));
            if (notification.account_id && notification.account_id !== accountId) {
                throwError(ErrorCodes.FORBIDDEN, 'No permission to access this notification');
            }
            res.json(notification);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách thông báo của người dùng hiện tại
     * @param req Request Express
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getNotificationsByUser = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const notifications = await this.notificationService.getNotificationsByUser(accountId);
            res.json(notifications);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy tất cả thông báo với các bộ lọc tùy chọn
     * @param req Request Express với các tham số truy vấn trong query
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getAllNotifications = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        const { account_id, role_id, type, is_read, page, limit } = req.query;
        try {
            const notifications = await this.notificationService.getAllNotifications({
                account_id: account_id as string,
                role_id: role_id ? parseInt(role_id as string) : undefined,
                type: type as NotificationType,
                is_read: is_read === 'true' ? true : is_read === 'false' ? false : undefined,
                page: page ? parseInt(page as string) : 1,
                limit: limit ? parseInt(limit as string) : 10,
            });
            res.json(notifications);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Tạo mã OTP
     * @param req Request Express với địa chỉ email trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    generateOtp = async (req: Request, res: Response, next: NextFunction) => {
        const { email } = req.body;
        try {
            await this.notificationService.generateAndStoreOtp(email);
            res.status(200).json({ message: 'OTP generated and sent successfully' });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xác thực mã OTP
     * @param req Request Express với địa chỉ email và mã OTP trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
        const { email, otp } = req.body;
        try {
            const isValid = await this.notificationService.verifyOtp(email, otp);
            res.status(200).json({ 
                success: isValid ? true : false,
                message: isValid ? 'OTP verified successfully' : 'OTP verification failed' 
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Gửi mã OTP
     * @param req Request Express với địa chỉ email trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    sendOtp = async (req: Request, res: Response, next: NextFunction) => {
        const { email } = req.body;
        try {
            await this.notificationService.generateAndStoreOtp(email);
            res.status(200).json({ 
                success: true,
                message: 'OTP sent successfully' 
            });
        } catch (error) {
            next(error);
        }
    };
}

export default NotificationController;

