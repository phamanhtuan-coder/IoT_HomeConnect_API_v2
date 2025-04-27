// src/services/notification.service.ts
import transporter from '../config/nodemailer';

export class NotificationService {
    async sendOtpEmail(email: string, otp: string) {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP Code',
            template: 'otp',
            context: { otp, currentYear: new Date().getFullYear() },
        });
        console.log('OTP email sent to', email);
        return { message: 'OTP sent', email, otp };
    }

    async sendEmergencyAlertEmail(email: string, message: string) {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Cảnh Báo Khẩn Cấp',
            template: 'alert',
            context: { message, currentYear: new Date().getFullYear() },
        });
        console.log('Emergency alert email sent to', email);
        return { message: 'Emergency alert sent', email };
    }
}