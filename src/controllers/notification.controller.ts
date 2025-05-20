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

    generateOtp = async (req: Request, res: Response, next: NextFunction) => {
        const { email } = req.body;
        try {
            await this.notificationService.generateAndStoreOtp(email);
            res.json({ message: 'OTP generated and sent successfully' });
        } catch (error) {
            next(error);
        }
    };

    verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
        const { email, otp } = req.body;
        try {
            const isValid = await this.notificationService.verifyOtp(email, otp);
            res.json({ message: isValid ? 'OTP verified successfully' : 'OTP verification failed' });
        } catch (error) {
            next(error);
        }
    };

    sendOtp = async (req: Request, res: Response, next: NextFunction) => {
        const { email } = req.body;
        try {
            await this.notificationService.generateAndStoreOtp(email);
            res.json({ message: 'OTP sent successfully' });
        } catch (error) {
            next(error);
        }
    };
}

export default NotificationController;