import { PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";
import {AlertType} from "../types/alert-type";

class AlertTypeService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createAlertType(data: {
        alert_type_name: string;
        priority?: number;
    }): Promise<AlertType> {
        const existingAlertType = await this.prisma.alert_types.findFirst({
            where: { alert_type_name: data.alert_type_name, is_deleted: false },
        });
        if (existingAlertType) {
            throwError(ErrorCodes.CONFLICT, "Alert type name already exists");
        }

        const alertType = await this.prisma.alert_types.create({
            data: {
                alert_type_name: data.alert_type_name,
                priority: data.priority,
            },
        });

        return this.mapPrismaAlertTypeToAuthAlertType(alertType);
    }

    async updateAlertType(
        alertTypeId: number,
        data: {
            alert_type_name?: string;
            priority?: number;
        }
    ): Promise<AlertType> {
        const alertType = await this.prisma.alert_types.findUnique({
            where: { alert_type_id: alertTypeId, is_deleted: false },
        });
        if (!alertType) {
            throwError(ErrorCodes.NOT_FOUND, "Alert type not found");
        }

        if (data.alert_type_name) {
            const existingAlertType = await this.prisma.alert_types.findFirst({
                where: {
                    alert_type_name: data.alert_type_name,
                    is_deleted: false,
                    alert_type_id: { not: alertTypeId },
                },
            });
            if (existingAlertType) {
                throwError(ErrorCodes.CONFLICT, "Alert type name already exists");
            }
        }

        const updatedAlertType = await this.prisma.alert_types.update({
            where: { alert_type_id: alertTypeId },
            data: {
                alert_type_name: data.alert_type_name,
                priority: data.priority,
                updated_at: new Date(),
            },
        });

        return this.mapPrismaAlertTypeToAuthAlertType(updatedAlertType);
    }

    async deleteAlertType(alertTypeId: number): Promise<void> {
        const alertType = await this.prisma.alert_types.findUnique({
            where: { alert_type_id: alertTypeId, is_deleted: false },
        });
        if (!alertType) {
            throwError(ErrorCodes.NOT_FOUND, "Alert type not found");
        }

        await this.prisma.alert_types.update({
            where: { alert_type_id: alertTypeId },
            data: { is_deleted: true, updated_at: new Date() },
        });
    }

    async getAlertTypeById(alertTypeId: number): Promise<AlertType> {
        const alertType = await this.prisma.alert_types.findUnique({
            where: { alert_type_id: alertTypeId, is_deleted: false },
        });
        if (!alertType) {
            throwError(ErrorCodes.NOT_FOUND, "Alert type not found");
        }

        return this.mapPrismaAlertTypeToAuthAlertType(alertType);
    }

    async getAllAlertTypes(): Promise<AlertType[]> {
        const alertTypes = await this.prisma.alert_types.findMany({
            where: { is_deleted: false },
        });

        return alertTypes.map((alertType) =>
            this.mapPrismaAlertTypeToAuthAlertType(alertType)
        );
    }

    private mapPrismaAlertTypeToAuthAlertType(alertType: any): AlertType {
        return {
            alert_type_id: alertType.alert_type_id,
            alert_type_name: alertType.alert_type_name,
            priority: alertType.priority,
            is_deleted: alertType.is_deleted,
            created_at: alertType.created_at,
            updated_at: alertType.updated_at,
        };
    }
}

export default AlertTypeService;