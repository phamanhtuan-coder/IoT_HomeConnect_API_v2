import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { Notification, NotificationType } from '../types/notification';
import admin from '../config/firebase';
import transporter from '../config/nodemailer';
import path from 'path';

class NotificationService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createNotification(input: {
        account_id?: string;
        role_id?: number;
        text: string;
        type: NotificationType;
        is_read?: boolean;
    }): Promise<Notification> {
        const { account_id, role_id, text, type, is_read = false } = input;

        if (account_id) {
            const account = await this.prisma.account!.findUnique({
                where: { account_id, deleted_at: null },
            });
            if (!account) throwError(ErrorCodes.NOT_FOUND, 'Account not found');
        }

        if (role_id) {
            const role = await this.prisma.role.findUnique({
                where: { id: role_id },
            });
            if (!role) throwError(ErrorCodes.NOT_FOUND, 'Role not found');
        }

        const notification = await this.prisma.notification.create({
            // @ts-ignore
            data: {
                account_id,
                role_id,
                text,
                type,
                is_read,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });

        // Send email if applicable
        await this.sendNotificationEmail({ account_id, text, type });

        // Send FCM notification if applicable
        if (account_id) {
            const account = await this.prisma.account!.findUnique({
                where: { account_id },
                include: { customer: true },
            });
            if (account?.customer?.email) {
                const fcmMessage = {
                    token: account!.customer.email, // Adjust based on actual FCM token field
                    notification: {
                        title: `New ${type} Notification`,
                        body: text,
                    },
                    data: { type },
                };
                await admin.messaging().send(fcmMessage);
            }
        }

        return this.mapPrismaNotificationToAuthNotification(notification);
    }

    async updateNotification(id: number, data: { is_read?: boolean }): Promise<Notification> {
        const notification = await this.prisma.notification.findUnique({
            where: { id, deleted_at: null },
        });
        if (!notification) throwError(ErrorCodes.NOT_FOUND, 'Notification not found');

        const updatedNotification = await this.prisma.notification.update({
            where: { id },
            data: { is_read: data.is_read, updated_at: new Date() },
        });

        return this.mapPrismaNotificationToAuthNotification(updatedNotification);
    }

    async softDeleteNotification(id: number): Promise<void> {
        const notification = await this.prisma.notification.findUnique({
            where: { id, deleted_at: null },
        });
        if (!notification) throwError(ErrorCodes.NOT_FOUND, 'Notification not found');

        await this.prisma.notification.update({
            where: { id },
            data: { deleted_at: new Date(), updated_at: new Date() },
        });
    }

    async getNotificationById(id: number): Promise<Notification> {
        const notification = await this.prisma.notification.findUnique({
            where: { id, deleted_at: null },
        });
        if (!notification) throwError(ErrorCodes.NOT_FOUND, 'Notification not found');

        return this.mapPrismaNotificationToAuthNotification(notification);
    }

    async getNotificationsByUser(accountId: string): Promise<Notification[]> {
        const notifications = await this.prisma.notification.findMany({
            where: { account_id: accountId, deleted_at: null },
            orderBy: { created_at: 'desc' },
        });

        return notifications.map(this.mapPrismaNotificationToAuthNotification);
    }

    async getAllNotifications(filters: {
        account_id?: string;
        role_id?: number;
        type?: NotificationType;
        is_read?: boolean;
        page?: number;
        limit?: number;
    }): Promise<Notification[]> {
        const { account_id, role_id, type, is_read, page = 1, limit = 10 } = filters;

        const notifications = await this.prisma.notification.findMany({
            where: {
                account_id,
                role_id,
                type,
                is_read,
                deleted_at: null,
            },
            orderBy: { created_at: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return notifications.map(this.mapPrismaNotificationToAuthNotification);
    }

    async sendNotificationEmail(input: { account_id?: string; text: string; type: NotificationType }) {
        if (!input.account_id) return;

        const account = await this.prisma.account!.findUnique({
            where: { account_id: input.account_id },
            include: { customer: true },
        });
        if (!account?.customer?.email) return;

        let template = 'notification';
        if (input.type === NotificationType.SHARE_REQUEST) template = 'share_request';
        if (input.type === NotificationType.TICKET) template = 'ticket';
        if (input.type === NotificationType.SECURITY) template = 'security';

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: account!.customer.email,
            subject: `New ${input.type} Notification`,
            template,
            context: {
                text: input.text,
                currentYear: new Date().getFullYear(),
            },
        });
    }

    // Add to src/services/notification.service.ts

    async generateAndStoreOtp(email: string): Promise<string> {
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

        const account = await this.prisma.account!.findFirst({
            where: { customer: { email }, deleted_at: null },
        });
        if (!account) throwError(ErrorCodes.NOT_FOUND, 'Account not found');

        await this.prisma.account!.update({
            where: { account_id: account!.account_id },
            data: {
                verification_code: otp,
                verification_expiry: expiry,
                updated_at: new Date(),
            },
        });

        await this.sendOtpEmail(email, otp);
        return otp;
    }

    async verifyOtp(email: string, otp: string): Promise<boolean> {
        const account = await this.prisma.account!.findFirst({
            where: { customer: { email }, deleted_at: null },
        });
        if (!account) throwError(ErrorCodes.NOT_FOUND, 'Account not found');

        if (!account!.verification_code || !account!.verification_expiry) {
            throwError(ErrorCodes.BAD_REQUEST, 'No OTP found for this account');
        }

        if (account!.verification_code !== otp) {
            throwError(ErrorCodes.BAD_REQUEST, 'Invalid OTP');
        }

        if (new Date() > account!.verification_expiry!) {
            throwError(ErrorCodes.BAD_REQUEST, 'OTP has expired');
        }

        // Clear OTP after successful verification
        await this.prisma.account!.update({
            where: { account_id: account!.account_id },
            data: {
                verification_code: null,
                verification_expiry: null,
                updated_at: new Date(),
            },
        });

        return true;
    }

    async sendOtpEmail(email: string, otp: string): Promise<void> {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP Code',
            template: 'otp',
            context: {
                otp,
                currentYear: new Date().getFullYear(),
            },
        });
    }

    async sendEmergencyAlertEmail(email: string, message: string): Promise<void> {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Emergency Alert',
            template: 'alert',
            context: {
                message,
                currentYear: new Date().getFullYear(),
            },
        });
    }

    private mapPrismaNotificationToAuthNotification(notification: any): Notification {
        return {
            id: notification.id,
            account_id: notification.account_id,
            role_id: notification.role_id,
            text: notification.text,
            type: notification.type as NotificationType,
            is_read: notification.is_read,
            created_at: notification.created_at,
            updated_at: notification.updated_at,
            deleted_at: notification.deleted_at,
        };
    }
}

export default NotificationService;