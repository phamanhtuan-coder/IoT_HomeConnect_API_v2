import { PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";
import admin from "../config/firebase";
import  NotificationService from "./notification.service";
import {Device} from "../types/device";
import {Alert} from "../types/alert";
import {NotificationType} from "../types/notification";
import prisma from "../config/database";

class AlertService {
    private prisma: PrismaClient;
    private notificationService: NotificationService;

    constructor() {
        this.prisma = prisma;
        this.notificationService = new NotificationService();
    }

// src/services/alert.service.ts
    async createAlert(device: Device, alertTypeId: number, message: string): Promise<Alert> {
        const alertType = await this.prisma.alert_types.findUnique({
            where: { alert_type_id: alertTypeId, is_deleted: false },
        });
        if (!alertType) {
            throwError(ErrorCodes.NOT_FOUND, "Alert type not found");
        }

        // Tạo alert trong database trước (business logic chính)
        const alert = await this.prisma.alerts.create({
            data: {
                device_serial: device.serial_number,
                space_id: device.space_id,
                message,
                alert_type_id: alertTypeId,
                status: "unread",
                timestamp: new Date(),
            },
        });

        // Gửi notifications không đồng bộ (non-blocking, optional)
        this.sendAlertNotifications(device, message, alertTypeId, alert.alert_id);

        return this.mapPrismaAlertToAuthAlert(alert);
    }

    /**
     * Gửi các thông báo cảnh báo một cách async (fire and forget)
     */
    private sendAlertNotifications(
        device: Device,
        message: string,
        alertTypeId: number,
        alertId: number
    ): void {
        // Fire and forget - không await để không block main flow
        this.processAlertNotifications(device, message, alertTypeId, alertId)
            .catch(error => {
                console.warn(`Alert notifications failed for device ${device.serial_number}:`, error.message);
            });
    }

    /**
     * Xử lý việc gửi thông báo cảnh báo
     */
    private async processAlertNotifications(
        device: Device,
        message: string,
        alertTypeId: number,
        alertId: number
    ): Promise<void> {
        const user = await this.prisma.account.findUnique({
            where: { account_id: device.account_id! },
            include: { customer: true },
        });

        if (!user?.customer) {
            console.log(`No user/customer found for device ${device.serial_number}`);
            return;
        }

        const notificationService = new NotificationService();

        // 1. Gửi FCM push notification (best effort)
        if (device.account_id) {
            const fcmResult = await notificationService.sendFCMNotificationToUser(
                device.account_id,
                "🚨 Cảnh báo từ thiết bị",
                message,
                {
                    deviceSerial: device.serial_number,
                    deviceName: device.name || 'Unknown Device',
                    alertType: alertTypeId.toString(),
                    alertId: alertId.toString(),
                    timestamp: new Date().toISOString()
                }
            );

            if (fcmResult.success) {
                console.log(`FCM notifications sent for alert ${alertId}:`, fcmResult.details);
            }
        }

        // 2. Gửi email notification (independent of FCM)
        if (user.customer.email) {
            try {
                await notificationService.sendEmergencyAlertEmail(
                    user.customer.email,
                    `Thiết bị "${device.name || device.serial_number}" đã phát hiện: ${message}`
                );
                console.log(`Emergency email sent for alert ${alertId}`);
            } catch (emailError: any) {
                console.warn(`Email notification failed for alert ${alertId}:`, emailError.message);
            }
        }

        // 3. Tạo in-app notification record
        try {
            await notificationService.createNotification({
                account_id: device.account_id!,
                text: `Thiết bị "${device.name || device.serial_number}": ${message}`,
                type: NotificationType.SECURITY,
                is_read: false
            });
            console.log(`In-app notification created for alert ${alertId}`);
        } catch (notifError: any) {
            console.warn(`In-app notification failed for alert ${alertId}:`, notifError.message);
        }
    }

    async updateAlert(
        alertId: number,
        data: { message?: string; status?: string }
    ): Promise<Alert> {
        const alert = await this.prisma.alerts.findUnique({
            where: { alert_id: alertId, is_deleted: false },
        });
        if (!alert) {
            throwError(ErrorCodes.NOT_FOUND, "Alert not found");
        }

        if (data.status && !["unread", "read"].includes(data.status)) {
            throwError(ErrorCodes.BAD_REQUEST, "Invalid status value");
        }

        const updatedAlert = await this.prisma.alerts.update({
            where: { alert_id: alertId },
            data: {
                message: data.message,
                status: data.status,
                updated_at: new Date(),
            },
        });

        return this.mapPrismaAlertToAuthAlert(updatedAlert);
    }

    async softDeleteAlert(alertId: number): Promise<void> {
        const alert = await this.prisma.alerts.findUnique({
            where: { alert_id: alertId, is_deleted: false },
        });
        if (!alert) {
            throwError(ErrorCodes.NOT_FOUND, "Alert not found");
        }

        await this.prisma.alerts.update({
            where: { alert_id: alertId },
            data: { is_deleted: true, updated_at: new Date() },
        });
    }

    async hardDeleteAlert(alertId: number): Promise<void> {
        const alert = await this.prisma.alerts.findUnique({
            where: { alert_id: alertId },
        });
        if (!alert) {
            throwError(ErrorCodes.NOT_FOUND, "Alert not found");
        }

        await this.prisma.alerts.delete({
            where: { alert_id: alertId },
        });
    }

    async getAlertById(alertId: number): Promise<Alert> {
        const alert = await this.prisma.alerts.findUnique({
            where: { alert_id: alertId, is_deleted: false },
        });
        if (!alert) {
            throwError(ErrorCodes.NOT_FOUND, "Alert not found");
        }

        return this.mapPrismaAlertToAuthAlert(alert);
    }

    async getAllAlerts(): Promise<Alert[]> {
        const alerts = await this.prisma.alerts.findMany({
            where: { is_deleted: false },
        });

        return alerts.map((alert) => this.mapPrismaAlertToAuthAlert(alert));
    }

    private mapPrismaAlertToAuthAlert(alert: any): Alert {
        return {
            alert_id: alert.alert_id,
            device_serial: alert.device_serial,
            space_id: alert.space_id,
            message: alert.message,
            timestamp: alert.timestamp,
            status: alert.status,
            alert_type_id: alert.alert_type_id,
            created_at: alert.created_at,
            updated_at: alert.updated_at,
            is_deleted: alert.is_deleted,
        };
    }
}

export default AlertService;