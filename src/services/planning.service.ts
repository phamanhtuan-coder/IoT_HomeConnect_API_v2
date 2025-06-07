// src/services/planning.service.ts
import { PrismaClient } from '@prisma/client';
import { PlanningCreateInput, PlanningApprovalInput, Planning, PlanningStatus, BatchCreateInput } from '../types/planning';
import { ErrorCodes, throwError } from '../utils/errors';
import { generatePlanningId, calculatePlanningStatus, generateBatchId } from '../utils/helpers';

export class PlanningService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async getPlanningsByBatchProductionStatusIsCompleted(): Promise<any> {
        const plannings = await this.prisma.planning.findMany({
            where: {
                production_batches: {
                    some: {
                        status: 'completed'
                    }
                }
            },
            select: {
                planning_id: true,
                status: true,
            }
        });

        return plannings;
    }

    async createPlanning(data: PlanningCreateInput, employeeId: string): Promise<any> {
        if (data.batch_count < 1 || data.batch_count > 20) {
            throwError(ErrorCodes.BAD_REQUEST, 'Batch count must be between 1 and 20');
        }

        try {
            const planning = await this.prisma.planning.create({
                data: {
                    planning_id: generatePlanningId(),
                    planning_note: data.planning_note,
                    created_by: employeeId,
                    status: 'pending',
                    logs: {
                        created: {
                            timestamp: new Date().toISOString(),
                            employee_id: employeeId,
                            action: 'created',
                            details: JSON.parse(JSON.stringify(data))
                        }
                    } as any
                }
            });

            console.log('planning:', planning)
            return planning;

        } catch (error) {
            console.log(error)
            throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create planning');
        }
    }

    async getPlanningById(planningId: string): Promise<Planning> {
        const planning = await this.prisma.planning.findFirst({
            where: {
                planning_id: planningId,
                // is_deleted: false
            },
            include: {
                production_batches: {
                    where: {},
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
                }
            }
        });

        if (!planning) {
            throwError(ErrorCodes.NOT_FOUND, 'Planning not found');
        }

        return planning as Planning;
    }

    async getAllPlannings(): Promise<Planning[]> {
        const plannings = await this.prisma.planning.findMany({
            where: {
                // is_deleted: false,

            },
            include: {
                production_batches: {
                    where: {},
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
                }
            },
            orderBy: { created_at: 'desc' }
        });
        return plannings;
    }

    async approvePlanning(planningId: string, data: PlanningApprovalInput, employeeId: string): Promise<Planning> {
        const planning = await this.prisma.planning.findFirst({
            where: {
                planning_id: planningId,
                is_deleted: false
            },
            include: {
                production_batches: {
                    where: { is_deleted: false }
                }
            }
        });

        if (!planning) {
            throwError(ErrorCodes.NOT_FOUND, 'Planning not found');
        }

        if (planning!.status !== 'pending') {
            throwError(ErrorCodes.BAD_REQUEST, 'Planning is not in pending status');
        }

        const updatedPlanning = await this.prisma.planning.update({
            where: { planning_id: planningId },
            data: {
                status: data.status === 'approved' ? 'in_progress' : 'rejected',
                updated_at: new Date(),
                logs: {
                    ...(planning?.logs as Record<string, any> || {}),
                    [data.status]: {
                        timestamp: new Date(),
                        employee_id: employeeId,
                        action: data.status,
                        notes: data.notes
                    }
                }
            }
        });

        if (data.status === 'approved') {
            await this.prisma.production_batches.updateMany({
                where: {
                    planning_id: planningId,
                    is_deleted: false
                },
                data: {
                    status: 'in_progress',
                    updated_at: new Date(),
                    logs: {
                        approved: {
                            timestamp: new Date(),
                            employee_id: employeeId,
                            action: 'approved',
                            notes: data.notes
                        }
                    }
                }
            });
        }

        if (data.status === 'rejected') {
            // Cập nhật cả planning và production_batches
            await this.prisma.$transaction([
                this.prisma.planning.update({
                    where: { planning_id: planningId },
                    data: {
                        status: 'rejected',
                        is_deleted: true,  // Thêm is_deleted = true cho planning
                        updated_at: new Date(),
                        logs: {
                            ...(planning?.logs as Record<string, any> || {}),
                            rejected: {
                                timestamp: new Date(),
                                employee_id: employeeId,
                                action: 'rejected',
                                notes: data.notes
                            }
                        }
                    }
                }),
                this.prisma.production_batches.updateMany({
                    where: {
                        planning_id: planningId,
                        is_deleted: false
                    },
                    data: {
                        status: 'rejected',
                        is_deleted: true,
                        updated_at: new Date(),
                        logs: {
                            rejected: {
                                timestamp: new Date(),
                                employee_id: employeeId,
                                action: 'rejected',
                                notes: data.notes
                            }
                        }
                    }
                })
            ]);
        }

        const finalPlanning = await this.prisma.planning.findFirst({
            where: {
                planning_id: planningId,
                // is_deleted: false
            },
            include: {
                production_batches: {
                    where: {},
                    include: {
                        device_templates: true
                    }
                }
            }
        });

        return finalPlanning as Planning;
    }

    async updatePlanningStatus(planningId: string): Promise<Planning> {
        const planning = await this.prisma.planning.findFirst({
            where: {
                planning_id: planningId,
                is_deleted: false
            },
            include: {
                production_batches: {
                    where: { is_deleted: false }
                }
            }
        });

        if (!planning) {
            throwError(ErrorCodes.NOT_FOUND, 'Planning not found');
        }

        const newStatus = calculatePlanningStatus(planning!.production_batches);

        return this.prisma.planning.update({
            where: { planning_id: planningId },
            data: { status: newStatus as PlanningStatus }
        });
    }

    // src/services/planning.service.ts
    async createPlanningWithBatches(planningData: PlanningCreateInput, batches: BatchCreateInput[], employeeId: string): Promise<any> {
        return this.prisma.$transaction(async (prisma) => {
            // Tạo planning
            const planning = await prisma.planning.create({
                data: {
                    planning_id: generatePlanningId(),
                    planning_note: planningData.planning_note,
                    created_by: employeeId,
                    status: 'pending',
                    logs: {
                        created: {
                            timestamp: new Date().toISOString(),
                            employee_id: employeeId,
                            action: 'created',
                            details: JSON.parse(JSON.stringify(planningData))
                        }
                    } as any
                }
            });

            // Tạo các batch
            for (const batchData of batches) {
                // Kiểm tra template
                const template = await prisma.device_templates.findFirst({
                    where: {
                        template_id: batchData.template_id,
                        is_deleted: false
                    },
                    include: {
                        firmware: true
                    }
                });

                if (!template) {
                    throwError(ErrorCodes.NOT_FOUND, 'Device template not found');
                }

                const firmwareBelongsToTemplate = template?.firmware.some(f => f.firmware_id === batchData.firmware_id);
                if (!firmwareBelongsToTemplate) {
                    throwError(ErrorCodes.BAD_REQUEST, 'Firmware not associated with this template');
                }

                // Tạo batch
                const batch = await prisma.production_batches.create({
                    data: {
                        planning_id: planning.planning_id,
                        production_batch_id: generateBatchId(),
                        template_id: batchData.template_id,
                        firmware_id: batchData.firmware_id,
                        quantity: batchData.quantity,
                        batch_note: batchData.batch_note,
                        status: 'pending',
                        logs: {
                            created: {
                                timestamp: new Date().toISOString(),
                                employee_id: employeeId,
                                action: 'created',
                                details: {
                                    ...JSON.parse(JSON.stringify(batchData)),
                                    firmware_id: batchData.firmware_id
                                }
                            }
                        } as any
                    }
                });

                // Tạo production_tracking records
                const trackingPromises = Array.from({ length: batchData.quantity }, async (_, index) => {
                    const templateName = template!.name;
                    const shortName = templateName
                        .split(' ')
                        .map(word => word[0])
                        .join('')
                        .toUpperCase();
                    const sequenceNumber = (index + 1).toString().padStart(3, '0');
                    const deviceSerial = `${shortName}-${batch.production_batch_id}-${sequenceNumber}`;

                    return prisma.production_tracking.create({
                        data: {
                            production_batch_id: batch.production_batch_id,
                            device_serial: deviceSerial,
                            stage: 'pending',
                            status: 'pending',
                            state_logs:[]
                            
                        }
                    });
                });

                await Promise.all(trackingPromises);
            }

            // Lấy lại planning với tất cả thông tin
            return prisma.planning.findFirst({
                where: {
                    planning_id: planning.planning_id,
                    is_deleted: false
                },
                include: {
                    production_batches: {
                        where: { is_deleted: false },
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
                    }
                }
            });
        });
    }

}