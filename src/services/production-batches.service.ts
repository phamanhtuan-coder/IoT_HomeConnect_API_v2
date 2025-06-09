// src/services/batch.service.ts
import { PrismaClient } from '@prisma/client';
import { BatchCreateInput, BatchUpdateInput, ProductionBatch } from '../types/planning';
import { ErrorCodes, throwError } from '../utils/errors';
import {generateBatchId, generateFirmwareId} from '../utils/helpers';
import { PlanningService } from './planning.service';
import { calculatePlanningStatus } from '../utils/helpers';

export class BatchService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createBatch(planningId: string, data: BatchCreateInput, employeeId: string): Promise<ProductionBatch> {
        const planning = await this.prisma.planning.findFirst({
            where: {
                planning_id: planningId,
                is_deleted: false
            }
        });

        if (!planning) {
            throwError(ErrorCodes.NOT_FOUND, 'Planning not found');
        }
       // không phải pending thì ko tạo được batch
        if (planning!.status!== 'pending') {
            throwError(ErrorCodes.BAD_REQUEST, 'Cannot create batch for non-pending planning');
        }

        // Kiểm tra template có tồn tại không
        const template = await this.prisma.device_templates.findFirst({
            where: {
                template_id: data.template_id,
                is_deleted: false
            },
            include: {
                firmware: true
            }
        });

        if (!template) {
            throwError(ErrorCodes.NOT_FOUND, 'Device template not found');
        }

        // Nếu có firmware_id, kiểm tra firmware có tồn tại và thuộc template không
        if (data.firmware_id) {
            const firmwareExists = template!.firmware?.some(f => f.firmware_id === data.firmware_id);
            if (!firmwareExists) {
                throwError(ErrorCodes.BAD_REQUEST, 'Firmware not found or not associated with this template');
            }
        }

        let batch_id: string;
        let attempts = 0;
        const maxAttempts = 5;
        do {
            batch_id = generateBatchId();
            const idExists = await this.prisma.firmware.findFirst({ where: { batch_id: batch_id }});
            if (!idExists) break;
            attempts++;
            if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique ID');
        } while (true);

        // Tạo batch mới
        const batch = await this.prisma.production_batches.create({
            data: {
                planning_id: planningId,
                production_batch_id: batch_id,
                template_id: data.template_id,
                quantity: data.quantity,
                batch_note: data.batch_note,
                status: 'pending',
                logs: {
                    created: {
                        timestamp: new Date().toISOString(),
                        employee_id: employeeId,
                        action: 'created',
                        details: {
                            ...JSON.parse(JSON.stringify(data)),
                            firmware_id: data.firmware_id
                        }
                    }
                } as any
            },
            include: {
                device_templates: {
                    include: {
                        firmware: {
                            select: {
                                firmware_id: true,
                                name: true,
                                version: true
                            }
                        }
                    }
                }
            }
        });

        // Tạo production_tracking records cho từng sản phẩm trong lô
        const trackingPromises = Array.from({ length: data.quantity }, async (_, index) => {
            // Tạo từ tắt từ template name
            const templateName = template!.name;
            const shortName = templateName
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase();

            // Tạo device_serial theo format: {SHORT_NAME}{BATCH_ID}{SEQUENCE_NUMBER}
            // Ví dụ: SL-BATCH1234-001
            const sequenceNumber = (index + 1).toString().padStart(3, '0');
            const deviceSerial = `${shortName}-${batch.production_batch_id}-${sequenceNumber}`;

            return this.prisma.production_tracking.create({
                data: {
                    production_batch_id: batch.production_batch_id,
                    device_serial: deviceSerial,
                    stage: 'pending',
                    status: 'pending'
                }
            });
        });

        // Thực hiện tạo tất cả production_tracking records
        await Promise.all(trackingPromises);

        // Lấy lại batch với thông tin mới nhất bao gồm production_tracking
        const finalBatch = await this.prisma.production_batches.findFirst({
            where: {
                production_batch_id: batch.production_batch_id,
                is_deleted: false
            },
            include: {
                device_templates: {
                    include: {
                        firmware: {
                            select: {
                                firmware_id: true,
                                name: true,
                                version: true
                            }
                        }
                    }
                },
                production_tracking: true
            }
        });

        return finalBatch as ProductionBatch;
    }

    async updateBatchStatus(batchId: string, data: BatchUpdateInput, employeeId: string): Promise<ProductionBatch> {
        // 1. Tìm batch và kiểm tra
        const batch = await this.prisma.production_batches.findFirst({
            where: {
                production_batch_id: batchId,
                is_deleted: false
            },
            include: {
                planning: true
            }
        });

        if (!batch) {
            throwError(ErrorCodes.NOT_FOUND, 'Batch not found');
        }

        // 2. Cập nhật status của batch
        const updatedBatch = await this.prisma.production_batches.update({
            where: { production_batch_id: batchId },
            data: {
                status: data.status,
                batch_note: data.batch_note,
                updated_at: new Date(),
                logs: {
                    ...(batch?.logs as Record<string, any> || {}),
                    [data.status]: {
                        timestamp: new Date(),
                        employee_id: employeeId,
                        action: data.status,
                        notes: data.batch_note
                    }
                }
            }
        });

        // 3. Lấy tất cả batches của planning để tính toán status mới
        const allBatches = await this.prisma.production_batches.findMany({
            where: {
                planning_id: batch!.planning_id,
                is_deleted: false
            }
        });

        // 4. Tính toán status mới cho planning
        const newPlanningStatus = calculatePlanningStatus(allBatches);

        // 5. Cập nhật status của planning
        await this.prisma.planning.update({
            where: { planning_id: batch!.planning_id },
            data: { status: newPlanningStatus, updated_at: new Date() }
        });

        // 6. Lấy lại thông tin batch với thông tin mới nhất
        const finalBatch = await this.prisma.production_batches.findFirst({
            where: {
                production_batch_id: batchId,
                is_deleted: false
            },
            include: {
                device_templates: true,
                planning: true
            }
        });

        return finalBatch as ProductionBatch;
    }

    async getBatchesByPlanningId(planningId: string): Promise<ProductionBatch[]> {
        return this.prisma.production_batches.findMany({
            where: {
                planning_id: planningId,
                // is_deleted: false
            },
            include: {
                device_templates: {
                    include: {
                        firmware: {
                            select: {
                                firmware_id: true,
                                name: true,
                                version: true
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'asc' }
        });
    }

    async getListBatch(): Promise<any> {
        const listBatch = await this.prisma.production_batches.findMany({
            where: {
                is_deleted: false
            },
            select: {
                production_batch_id: true,
                quantity: true,
            }
        });

        return {
            success: true,
            data: listBatch
        }
    }
}