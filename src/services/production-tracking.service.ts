import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { ProductionTracking, ProductionTrackingInput } from '../types/production-tracking';

export class ProductionTrackingService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createProductionTracking(input: ProductionTrackingInput & { employee_id?: string }): Promise<ProductionTracking> {
        const { batch_id, device_serial, stage, status = 'pending', employee_id } = input;

        // Verify production batch exists
        const productionBatch = await this.prisma.production_batches.findFirst({
            where: { production_batch_id: batch_id, is_deleted: false },
        });
        if (!productionBatch) throwError(ErrorCodes.NOT_FOUND, 'Production batch not found');

        // Verify device exists
        const device = await this.prisma.devices.findUnique({
            where: { serial_number: device_serial, is_deleted: false },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');

        // Create production tracking record
        const productionTracking = await this.prisma.production_tracking.create({
            data: {
                production_batch_id: batch_id,
                device_serial,
                stage,
                status,
                state_logs: {},
                created_at: new Date(),
                updated_at: new Date(),
            },
        });

        return this.mapPrismaProductionTrackingToProductionTracking(productionTracking);
    }

    async getProductionTrackingById(productionId: number): Promise<ProductionTracking> {
        const productionTracking = await this.prisma.production_tracking.findFirst({
            where: { production_id: productionId, is_deleted: false },
            include: {
                production_batches: true,
                devices: true,
            }
        });

        if (!productionTracking) {
            throwError(ErrorCodes.NOT_FOUND, 'Production tracking record not found');
        }
        return this.mapPrismaProductionTrackingToProductionTracking(productionTracking);
    }

    async getProductionTrackingByBatchId(batchId: string): Promise<ProductionTracking[]> {
        const productionTrackings = await this.prisma.production_tracking.findMany({
            where: { production_batch_id: batchId, is_deleted: false },
            include: {
                production_batches: true,
                devices: true,
            }
        });
        return productionTrackings.map(pt => this.mapPrismaProductionTrackingToProductionTracking(pt));
    }

    async updateProductionTracking(
        productionId: number,
        input: Partial<ProductionTrackingInput> & { employee_id?: string }
    ): Promise<ProductionTracking> {
        const productionTracking = await this.prisma.production_tracking.findUnique({
            where: { production_id: productionId, is_deleted: false },
        });
        if (!productionTracking) {
            throwError(ErrorCodes.NOT_FOUND, 'Production tracking record not found');
        }

        // Verify batch if changing
        if (input.batch_id) {
            const batch = await this.prisma.production_batches.findUnique({
                where: { production_batch_id: input.batch_id, is_deleted: false },
            });
            if (!batch) throwError(ErrorCodes.NOT_FOUND, 'Production batch not found');
        }

        // Verify device if changing
        if (input.device_serial) {
            const device = await this.prisma.devices.findUnique({
                where: { serial_number: input.device_serial, is_deleted: false },
            });
            if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');
        }

        // Handle status transitions and timestamps
        let updateData: any = {};

        if (input.batch_id) {
            updateData.production_batch_id = input.batch_id;
        }

        if (input.device_serial) {
            updateData.device_serial = input.device_serial;
        }

        if (input.stage) {
            updateData.stage = input.stage;
        }

        if (input.status) {
            updateData.status = input.status;
            switch (input.status) {
                case 'in_progress':
                    updateData.started_at = new Date();
                    break;
                case 'completed':
                case 'failed':
                    updateData.completed_at = new Date();
                    break;
            }
        }

        if (input.employee_id) {
            updateData.employee_id = input.employee_id;
        }

        if (input.state_logs) {
            // Get existing state_logs or initialize as an empty object
            const existingLogs = productionTracking!.state_logs || {};

            // Update with new state_logs
            Object.assign(existingLogs, input.state_logs);
            updateData.state_logs = existingLogs;
        }

        const updatedProductionTracking = await this.prisma.production_tracking.update({
            where: { production_id: productionId },
            data: {
                ...updateData,
                updated_at: new Date(),
            },
            include: {
                production_batches: true,
                devices: true,
            }
        });

        return this.mapPrismaProductionTrackingToProductionTracking(updatedProductionTracking);
    }

    async deleteProductionTracking(productionId: number): Promise<void> {
        const productionTracking = await this.prisma.production_tracking.findUnique({
            where: { production_id: productionId, is_deleted: false },
        });
        if (!productionTracking) {
            throwError(ErrorCodes.NOT_FOUND, 'Production tracking record not found');
        }

        await this.prisma.production_tracking.update({
            where: { production_id: productionId },
            data: {
                is_deleted: true,
                updated_at: new Date(),
            },
        });
    }

    private mapPrismaProductionTrackingToProductionTracking(pt: any): ProductionTracking {
        const stateLogs = pt.state_logs || {};

        return {
            production_id: pt.production_id,
            batch_id: pt.production_batch_id,
            device_serial: pt.device_serial,
            stage: pt.stage,
            status: pt.status,
            employee_id: pt.employee_id,
            started_at: pt.started_at,
            completed_at: pt.completed_at,
            created_at: pt.created_at,
            updated_at: pt.updated_at,
            is_deleted: pt.is_deleted,
        };
    }
}
