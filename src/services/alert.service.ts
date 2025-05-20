import { PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";
import admin from "../config/firebase";
import  NotificationService from "./notification.service";
import {Device} from "../types/device";
import {Alert} from "../types/alert";


class AlertService {
    private prisma: PrismaClient;
    private notificationService: NotificationService;

    constructor() {
        this.prisma = new PrismaClient();
        this.notificationService = new NotificationService();
    }

    async createAlert(
        device: Device,
        alertTypeId: number,
        message: string
    ): Promise<Alert> {
        const alertType = await this.prisma.alert_types.findUnique({
            where: { alert_type_id: alertTypeId, is_deleted: false },
        });
        if (!alertType) {
            throwError(ErrorCodes.NOT_FOUND, "Alert type not found");
        }

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

        // Send notifications
        const user = await this.prisma.account.findUnique({
            where: { account_id: device.account_id! },
            include: { customer: true },
        });

        if (user?.customer?.email) {
            // Send FCM notification
            const fcmMessage = {
                token: user.customer.email, // Adjust based on actual FCM token field
                notification: {
                    title: "Cảnh báo từ thiết bị",
                    body: message,
                },
                data: {
                    deviceId: device.serial_number,
                    alertType: alertTypeId.toString(),
                },
            };
            await admin.messaging().send(fcmMessage);

            // Send email
            await this.notificationService.sendEmergencyAlertEmail(
                user.customer.email,
                message
            );
        }

        return this.mapPrismaAlertToAuthAlert(alert);
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