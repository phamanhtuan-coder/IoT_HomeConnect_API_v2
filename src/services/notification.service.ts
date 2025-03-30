// src/services/notification.service.ts
import transporter from '../config/nodemailer';

export class NotificationService {
    async sendOtpEmail(email: string, otp: string) {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP Code',
            template: 'otp',
            context: { otp },
        });
        console.log('OTP email sent to', email);
        return { message: 'OTP sent', email, otp };
    }
}