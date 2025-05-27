import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError, AppError } from '../utils/errors';
import { ProductionBatch, ProductionBatchCreateInput, ProductionBatchUpdateInput } from '../types/production-batches';

export class ProductionBatchesService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createProductionBatch(input: ProductionBatchCreateInput, employeeId: string): Promise<ProductionBatch> {
        try {
            const { template_id, quantity } = input;

            // Verify template exists and is not deleted
            const deviceTemplate = await this.prisma.device_templates.findFirst({
                where: {
                    template_id,
                    is_deleted: false
                },
                include: {
                    categories: true,    // Include related category info
                    template_components: true  // Include template components for validation
                }
            });

            if (!deviceTemplate) {
                throw throwError(ErrorCodes.NOT_FOUND, 'Device template not found or has been deleted');
            }

            // Generate production batch ID
            const date = new Date();
            const batchPrefix = 'PB';
            const yearMonth = date.getFullYear().toString().slice(-2) + (date.getMonth() + 1).toString().padStart(2, '0');

            // Get current sequence for the month
            const lastBatch = await this.prisma.production_batches.findFirst({
                where: {
                    production_batch_id: {
                        startsWith: `${batchPrefix}${yearMonth}`,
                    },
                },
                orderBy: {
                    batch_id: 'desc',
                },
            });

            let sequence = 1;
            if (lastBatch) {
                const lastSequence = parseInt(lastBatch.production_batch_id.slice(-4));
                sequence = lastSequence + 1;
            }

            const productionBatchId = `${batchPrefix}${yearMonth}${sequence.toString().padStart(4, '0')}`;

            // Create production batch
            const productionBatch = await this.prisma.production_batches.create({
                data: {
                    production_batch_id: productionBatchId,
                    batch_id: sequence,
                    device_templates: {
                        connect: {
                            template_id: deviceTemplate.template_id
                        }
                    },
                    quantity,
                    status: 'pending',
                    account_production_batches_created_byToaccount: {
                        connect: {
                            account_id: employeeId
                        }
                    },
                    created_at: new Date(),
                    updated_at: new Date(),
                },
                include: {
                    device_templates: true,
                    account_production_batches_created_byToaccount: true,
                    account_production_batches_approved_byToaccount: true,
                    production_tracking: true,
                },
            });

            return this.mapPrismaProductionBatchToProductionBatch(productionBatch);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create production batch');
        }
    }

    async getProductionBatchById(batchId: number): Promise<ProductionBatch> {
        try {
            const productionBatch = await this.prisma.production_batches.findUnique({
                where: { batch_id: batchId, is_deleted: false },
                include: {
                    device_templates: true,
                    account_production_batches_created_byToaccount: true,
                    account_production_batches_approved_byToaccount: true,
                    production_tracking: true,
                },
            });

            if (!productionBatch) {
                throw throwError(ErrorCodes.NOT_FOUND, 'Production batch not found');
            }

            return this.mapPrismaProductionBatchToProductionBatch(productionBatch);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to get production batch');
        }
    }

    async getAllProductionBatches(): Promise<ProductionBatch[]> {
        try {
            const productionBatches = await this.prisma.production_batches.findMany({
                where: { is_deleted: false },
                include: {
                    device_templates: true,
                    account_production_batches_created_byToaccount: true,
                    account_production_batches_approved_byToaccount: true,
                    production_tracking: true,
                },
                orderBy: { created_at: 'desc' },
            });

            return productionBatches.map(batch => this.mapPrismaProductionBatchToProductionBatch(batch));
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to get production batches');
        }
    }

    async updateProductionBatch(
        batchId: number,
        input: Partial<ProductionBatchUpdateInput>,
        employeeId: string
    ): Promise<ProductionBatch> {
        try {
            const productionBatch = await this.prisma.production_batches.findFirst({
                where: {
                    batch_id: batchId,
                    is_deleted: false
                },
                include: {
                    device_templates: true
                }
            });

            if (!productionBatch) {
                throw throwError(ErrorCodes.NOT_FOUND, 'Production batch not found');
            }

            let updateData: any = { ...input };

            // Handle status transitions
            if (input.status) {
                switch (input.status) {
                    case 'approved':
                        if (productionBatch.status !== 'pending') {
                            throw throwError(ErrorCodes.BAD_REQUEST, 'Only pending batches can be approved');
                        }
                        updateData = {
                            ...updateData,
                            account_production_batches_approved_byToaccount: {
                                connect: {
                                    account_id: employeeId
                                }
                            },
                            approved_at: new Date(),
                        };
                        break;
                    case 'rejected':
                        if (productionBatch.status !== 'pending') {
                            throw throwError(ErrorCodes.BAD_REQUEST, 'Only pending batches can be rejected');
                        }
                        updateData = {
                            ...updateData,
                            account_production_batches_approved_byToaccount: {
                                connect: {
                                    account_id: employeeId
                                }
                            },
                            approved_at: new Date(),
                        };
                        break;
                    case 'in_progress':
                        if (productionBatch.status !== 'approved') {
                            throw throwError(ErrorCodes.BAD_REQUEST, 'Only approved batches can be set to in progress');
                        }
                        break;
                    case 'completed':
                        if (productionBatch.status !== 'in_progress') {
                            throw throwError(ErrorCodes.BAD_REQUEST, 'Only in-progress batches can be completed');
                        }
                        break;
                }
            }

            // Verify template if changing
            if (input.template_id) {
                const deviceTemplate = await this.prisma.device_templates.findFirst({
                    where: {
                        template_id: input.template_id,
                        is_deleted: false
                    },
                    include: {
                        template_components: true
                    }
                });

                if (!deviceTemplate) {
                    throw throwError(ErrorCodes.NOT_FOUND, 'Device template not found or has been deleted');
                }

                // Add template connection to update data
                updateData = {
                    ...updateData,
                    device_templates: {
                        connect: {
                            template_id: deviceTemplate.template_id
                        }
                    }
                };
            }

            const updatedBatch = await this.prisma.production_batches.update({
                where: { batch_id: batchId },
                data: {
                    ...updateData,
                    updated_at: new Date(),
                },
                include: {
                    device_templates: {
                        include: {
                            template_components: true
                        }
                    },
                    account_production_batches_created_byToaccount: true,
                    account_production_batches_approved_byToaccount: true,
                    production_tracking: true,
                },
            });

            return this.mapPrismaProductionBatchToProductionBatch(updatedBatch);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to update production batch');
        }
    }

    async deleteProductionBatch(batchId: number): Promise<void> {
        try {
            const productionBatch = await this.prisma.production_batches.findUnique({
                where: { batch_id: batchId, is_deleted: false },
            });

            if (!productionBatch) {
                throw throwError(ErrorCodes.NOT_FOUND, 'Production batch not found');
            }

            if (productionBatch.status !== 'pending' && productionBatch.status !== 'rejected') {
                throw throwError(ErrorCodes.BAD_REQUEST, 'Only pending or rejected batches can be deleted');
            }

            // Check if there are any related production tracking records
            const hasTrackingRecords = await this.prisma.production_tracking.findFirst({
                where: {
                    batch_id: batchId,
                    is_deleted: false,
                },
            });

            if (hasTrackingRecords) {
                throw throwError(ErrorCodes.BAD_REQUEST, 'Cannot delete batch with existing production tracking records');
            }

            await this.prisma.production_batches.update({
                where: { batch_id: batchId },
                data: {
                    is_deleted: true,
                    updated_at: new Date(),
                },
            });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to delete production batch');
        }
    }

    private mapPrismaProductionBatchToProductionBatch(pb: any): {
        batch_id: any;
        production_batch_id: any;
        template_id: any;
        quantity: any;
        status: any;
        created_by: any;
        created_at: any;
        approved_by: any;
        approved_at: any;
        updated_at: any;
        is_deleted: any;
        device_template: { template_id: any; name: any; components: any } | null
    } {
        return {
            batch_id: pb.batch_id,
            production_batch_id: pb.production_batch_id,
            template_id: pb.device_templates?.template_id ?? pb.template_id,
            quantity: pb.quantity,
            status: pb.status,
            created_by: pb.created_by,
            created_at: pb.created_at,
            approved_by: pb.approved_by,
            approved_at: pb.approved_at,
            updated_at: pb.updated_at,
            is_deleted: pb.is_deleted,
            device_template: pb.device_templates ? {
                template_id: pb.device_templates.template_id,
                name: pb.device_templates.name,
                components: pb.device_templates.template_components
            } : null
        };
    }
}
