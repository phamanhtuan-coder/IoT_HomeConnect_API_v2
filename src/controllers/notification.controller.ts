import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
    private notificationService: NotificationService;

    constructor() {
        this.notificationService = new NotificationService();
    }

    sendOtp = async (req: Request, res: Response, next: NextFunction) => {
        const { email, otp } = req.body;
        const result = await this.notificationService.sendOtpEmail(email, otp);
        res.json(result);
    };
}