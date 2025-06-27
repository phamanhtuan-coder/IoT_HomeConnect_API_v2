import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { Notification, NotificationType } from '../types/notification';
import admin from '../config/firebase';
import transporter from '../config/nodemailer';
import path from 'path';
import prisma from "../config/database";

class NotificationService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma
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

        // Tạo notification trong database trước (business logic chính)
        const notification = await this.prisma.notification.create({
            data: {
                account_id: input.account_id || null,
                role_id: input.role_id || null,
                text: input.text,
                type: input.type,
                is_read: false,
                created_at: new Date(),
                updated_at: new Date(),
            }
        });

        // Gửi các thông báo bổ sung (non-blocking, optional)
        this.sendOptionalNotifications(account_id, text, type);

        return this.mapPrismaNotificationToAuthNotification(notification);
    }

    /**
     * Gửi các thông báo bổ sung một cách async và non-blocking
     * Không throw error nếu fail
     */
    private sendOptionalNotifications(
        accountId: string | undefined,
        text: string,
        type: NotificationType
    ): void {
        // Fire and forget - không await để không block
        if (accountId) {
            // Email notification
            this.sendNotificationEmail({ account_id: accountId, text, type })
                .catch(error => {
                    console.warn('Email notification failed (non-critical):', error.message);
                });

            // FCM push notification
            this.sendFCMNotificationToUser(accountId, `New ${type} Notification`, text, { type })
                .catch(error => {
                    console.warn('FCM notification failed (non-critical):', error.message);
                });
        }
    }

    /**
     * Send FCM notification to all user devices (completely optional)
     * Never throws errors - always returns gracefully
     */
    async sendFCMNotificationToUser(
        accountId: string,
        title: string,
        body: string,
        data?: Record<string, string>
    ): Promise<{ success: boolean; details?: any }> {
        try {
            // Lấy tất cả device tokens của user
            const userDevices = await this.prisma.user_devices.findMany({
                where: {
                    user_id: accountId,
                    is_deleted: false,
                    device_token: { not: null }
                },
                select: {
                    user_device_id: true,
                    device_name: true,
                    device_token: true,
                    last_login: true
                }
            });

            if (userDevices.length === 0) {
                console.log(`No FCM tokens available for user ${accountId} - skipping push notification`);
                return { success: true, details: 'No tokens available' };
            }

            console.log(`Attempting to send FCM to ${userDevices.length} devices for user ${accountId}`);

            // Gửi đến từng device (best effort)
            const results = await Promise.allSettled(
                userDevices.map(device => this.sendFCMToDevice(device, title, body, data))
            );

            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failCount = results.filter(r => r.status === 'rejected').length;

            console.log(`FCM results for user ${accountId}: ${successCount} success, ${failCount} failed`);

            return {
                success: true,
                details: {
                    total: userDevices.length,
                    success: successCount,
                    failed: failCount
                }
            };

        } catch (error: any) {
            console.warn('FCM notification completely failed for user', accountId, ':', error.message);
            return { success: false, details: error.message };
        }
    }

    /**
     * Send FCM to specific device (best effort)
     * Never throws - always resolves
     */
    private async sendFCMToDevice(
        device: { user_device_id: string; device_name: string; device_token: string | null; last_login: Date | null },
        title: string,
        body: string,
        data?: Record<string, string>
    ): Promise<void> {
        if (!device.device_token || !this.isValidFCMToken(device.device_token)) {
            console.log(`Skipping FCM for device ${device.device_name}: invalid token`);
            return Promise.resolve();
        }

        try {
            const message = {
                token: device.device_token,
                notification: { title, body },
                data: this.sanitizeDataForFCM(data || {}),
                android: {
                    notification: {
                        sound: 'default',
                        priority: 'high' as const,
                        channelId: 'homeconnect_warning',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                        },
                    },
                },
            };

            const response = await admin.messaging().send(message);
            console.log(`✓ FCM sent to ${device.device_name}: ${response}`);

        } catch (error: any) {
            console.log(`✗ FCM failed for ${device.device_name}:`, error.message);

            // Clean up invalid tokens silently
            if (this.isInvalidTokenError(error)) {
                this.removeDeviceFCMToken(device.user_device_id)
                    .catch(e => console.log('Failed to cleanup invalid token:', e.message));
            }
        }
    }

    /**
     * Sanitize data for FCM (all values must be strings)
     */
    private sanitizeDataForFCM(data: Record<string, any>): Record<string, string> {
        const sanitized: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
            sanitized[key] = String(value);
        }
        return sanitized;
    }

    /**
     * Validate FCM token format
     */
    private isValidFCMToken(token: string): boolean {
        if (!token || typeof token !== 'string') return false;
        return token.length > 100 && !token.includes('@') && !token.includes(' ');
    }

    /**
     * Check if error is related to invalid FCM token
     */
    private isInvalidTokenError(error: any): boolean {
        const invalidTokenCodes = [
            'messaging/invalid-argument',
            'messaging/registration-token-not-registered',
            'messaging/invalid-registration-token'
        ];
        return error?.code && invalidTokenCodes.includes(error.code);
    }

    /**
     * Remove invalid FCM token (silent operation)
     */
    private async removeDeviceFCMToken(userDeviceId: string): Promise<void> {
        try {
            await this.prisma.user_devices.update({
                where: { user_device_id: userDeviceId },
                data: {
                    device_token: null,
                    updated_at: new Date()
                }
            });
            console.log(`Cleaned up invalid token for device ${userDeviceId}`);
        } catch (error: any) {
            console.log('Error cleaning up FCM token:', error.message);
        }
    }

    /**
     * Update FCM token for specific device
     * This is the only FCM operation that can throw (for API endpoints)
     */
    async updateDeviceFCMToken(userDeviceId: string, fcmToken: string): Promise<void> {
        if (!this.isValidFCMToken(fcmToken)) {
            throwError(ErrorCodes.BAD_REQUEST, 'Invalid FCM token format');
        }

        const device = await this.prisma.user_devices.findUnique({
            where: { user_device_id: userDeviceId, is_deleted: false }
        });

        if (!device) {
            throwError(ErrorCodes.NOT_FOUND, 'Device not found');
        }

        await this.prisma.user_devices.update({
            where: { user_device_id: userDeviceId },
            data: {
                device_token: fcmToken,
                updated_at: new Date()
            }
        });

        console.log(`FCM token updated for device ${userDeviceId}`);
    }

    /**
     * Get FCM tokens for user (for debugging)
     */
    async getUserFCMTokens(accountId: string): Promise<any[]> {
        try {
            return await this.prisma.user_devices.findMany({
                where: {
                    user_id: accountId,
                    is_deleted: false,
                    device_token: { not: null }
                },
                select: {
                    user_device_id: true,
                    device_name: true,
                    device_token: true,
                    last_login: true
                }
            });
        } catch (error) {
            console.warn('Failed to get user FCM tokens:', error);
            return [];
        }
    }

    /**
     * Test FCM connectivity (for health checks)
     */
    async testFCMConnection(): Promise<boolean> {
        try {
            // Simple test - just check if Firebase is initialized
            const app = admin.app();
            return !!app;
        } catch (error) {
            console.warn('FCM connection test failed:', error);
            return false;
        }
    }

    // === Existing methods (unchanged) ===

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
        } as any);
    }

    async generateAndStoreOtp(email: string): Promise<string> {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 5 * 60 * 1000);

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
        } as any);
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
        } as any);
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