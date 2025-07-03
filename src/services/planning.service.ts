// src/services/planning.service.ts
import { PrismaClient } from '@prisma/client';
import { PlanningCreateInput, PlanningApprovalInput, Planning, PlanningStatus, BatchCreateInput } from '../types/planning';
import { ErrorCodes, throwError } from '../utils/errors';
import { generatePlanningId, calculatePlanningStatus, generateBatchId, generateDeviceSerialId } from '../utils/helpers';
import prisma from "../config/database";

export class PlanningService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma
    }

    async createPlanning(data: PlanningCreateInput, employeeId: string): Promise<any> {
        if (data.batch_count < 1 || data.batch_count > 20) {
            throwError(ErrorCodes.BAD_REQUEST, 'Batch count must be between 1 and 20');
        }

        let planning_id: string;
        let attempts = 0;
        const maxAttempts = 5;
        do {
            planning_id = generatePlanningId();
            const idExists = await this.prisma.planning.findFirst({ where: { planning_id: planning_id } });
            if (!idExists) break;
            attempts++;
            if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique ID');
        } while (true);

        try {
            const planning = await this.prisma.planning.create({
                data: {
                    planning_id: planning_id,
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
            },
            include: {
                account: {
                    include: {
                        employee: {
                            select: { surname: true, lastname: true }
                        }
                    }
                },
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

        const creatorName = planning?.account?.employee
            ? `${planning.account.employee.surname} ${planning.account.employee.lastname}`.trim()
            : planning?.account?.username || '';

        return {
            ...planning,
            created_by: creatorName
        } as Planning;
    }

    async getAllPlannings(): Promise<Planning[]> {
        const plannings = await this.prisma.planning.findMany({
            where: {
                // is_deleted: false,
            },
            include: {
                account: {
                    include: {
                        employee: {
                            select: { surname: true, lastname: true }
                        }
                    }
                },
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

        // Map lại để trả về created_by là tên người tạo
        return plannings.map(planning => {
            const creatorName = planning.account?.employee
                ? `${planning.account.employee.surname} ${planning.account.employee.lastname}`.trim()
                : planning.account?.username || '';
            return {
                ...planning,
                created_by: creatorName
            } as Planning;
        });
    }

    async approvePlanning(planningId: string, data: PlanningApprovalInput, employeeId: string): Promise<Planning> {
        const account = await this.prisma.account.findFirst({
            where: { account_id: employeeId },
            include: { employee: { select: { surname: true, lastname: true } } }
        });
        const approverName = account?.employee
            ? `${account.employee.surname} ${account.employee.lastname}`.trim()
            : account?.username || '';
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
                        creator_name: approverName,
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
                            creator_name: approverName,
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
                                creator_name: approverName,
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
                                creator_name: approverName,
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

            const account = await prisma.account.findFirst({
                where: { account_id: employeeId },
                include: {
                    employee: { select: { surname: true, lastname: true } }
                }
            });
            const approverName = account?.employee
                ? `${account.employee.surname} ${account.employee.lastname}`.trim()
                : account?.username || '';
            // 1. Tạo planning với ID mới
            let planning_id: string;
            let attempts = 0;
            const maxAttempts = 5;
            do {
                planning_id = generatePlanningId();
                const idExists = await prisma.planning.findFirst({
                    where: { planning_id: planning_id }
                });
                if (!idExists) break;
                attempts++;
                if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique planning ID');
            } while (true);

            // Tạo planning
            const planning = await prisma.planning.create({
                data: {
                    planning_id: planning_id,
                    planning_note: planningData.planning_note,
                    created_by: employeeId,
                    status: 'pending',
                    logs: {
                        created: {
                            timestamp: new Date().toISOString(),
                            employee_id: employeeId,
                            creator_name: approverName,
                            action: 'created',
                            details: JSON.parse(JSON.stringify(planningData))
                        }
                    } as any
                }
            });

            // 2. Tạo các batch
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

                const firmwareBelongsToTemplate = !batchData.firmware_id || template?.firmware.some(f => f.firmware_id === batchData.firmware_id);
                if (!firmwareBelongsToTemplate) {
                    throwError(ErrorCodes.BAD_REQUEST, 'Firmware not associated with this template');
                }

                // Gen batch ID mới
                let batch_id: string;
                attempts = 0;
                do {
                    batch_id = generateBatchId();
                    const idExists = await prisma.production_batches.findFirst({
                        where: { production_batch_id: batch_id }
                    });
                    if (!idExists) break;
                    attempts++;
                    if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique batch ID');
                } while (true);
                console.log
                // Tạo batch
                const batch = await prisma.production_batches.create({
                    data: {
                        planning_id: planning.planning_id,
                        production_batch_id: batch_id,
                        template_id: batchData.template_id,
                        firmware_id: batchData.firmware_id || null,
                        quantity: batchData.quantity,
                        batch_note: batchData.batch_note,
                        status: 'pending',
                        logs: {
                            created: {
                                timestamp: new Date().toISOString(),
                                employee_id: employeeId,
                                creator_name: approverName,
                                action: 'created',
                                details: {
                                    ...JSON.parse(JSON.stringify(batchData)),
                                    firmware_id: batchData.firmware_id || null
                                }
                            }
                        } as any
                    }
                });

                // 3. Tạo production_tracking records với ID mới
                const trackingPromises = Array.from({ length: batchData.quantity }, async (_, index) => {
                    let deviceSerial: string;
                    let attempts = 0;
                    const maxAttempts = 5;
                    do {
                        deviceSerial = generateDeviceSerialId();
                        const idExists = await prisma.production_tracking.findFirst({
                            where: { device_serial: deviceSerial }
                        });
                        if (!idExists) break;
                        attempts++;
                        if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique ID');
                    } while (true);

                    return prisma.production_tracking.create({
                        data: {
                            production_batch_id: batch.production_batch_id,
                            device_serial: deviceSerial,
                            stage: 'pending',
                            status: 'pending',
                            state_logs: []
                        }
                    });
                });

                await Promise.all(trackingPromises);
            }

            // 4. Lấy lại planning với tất cả thông tin
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
        }, {
            timeout: 30000, // 30 giây
            maxWait: 10000  // 10 giây
        });
    }

}