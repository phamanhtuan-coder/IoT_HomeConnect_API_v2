import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError, AppError } from '../utils/errors';
import { Planning, PlanningCreateInput, PlanningUpdateInput } from '../types/planning';
import { generatePlanningId } from '../utils/helpers';

export class PlanningService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createPlanning(input: PlanningCreateInput, employeeId: string): Promise<Planning> {
        try {
            const planning = await this.prisma.planning.create({
                data: {
                    planning_id: generatePlanningId(),
                    ...input,
                    status: 'pending',
                    created_by: employeeId,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
                include: {
                    account: true,
                    production_batches: true,
                },
            });

            return this.mapPrismaPlanningToPlanning(planning);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create planning');
        }
    }

    async getPlanningById(planningId: string): Promise<Planning> {
        try {
            const planning = await this.prisma.planning.findFirst({
                where: { planning_id: planningId, is_deleted: false },
                include: {
                    account: true,
                    production_batches: true,
                },
            });

            if (!planning) {
                throw throwError(ErrorCodes.NOT_FOUND, 'Planning not found');
            }

            return this.mapPrismaPlanningToPlanning(planning);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to get planning');
        }
    }

    async getAllPlannings(): Promise<Planning[]> {
        try {
            const plannings = await this.prisma.planning.findMany({
                where: { is_deleted: false },
                include: {
                    account: true,
                    production_batches: true,
                },
                orderBy: { created_at: 'desc' },
            });

            return plannings.map(planning => this.mapPrismaPlanningToPlanning(planning));
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to get plannings');
        }
    }

    async updatePlanning(planningId: string, input: PlanningUpdateInput): Promise<Planning> {
        try {
            const planning = await this.prisma.planning.findFirst({
                where: {
                    planning_id: planningId,
                    is_deleted: false
                }
            });

            if (!planning) {
                throw throwError(ErrorCodes.NOT_FOUND, 'Planning not found');
            }

            // Validate status transitions
            if (input.status) {
                switch (input.status) {
                    case 'in_progress':
                        if (planning.status !== 'pending') {
                            throw throwError(ErrorCodes.BAD_REQUEST, 'Only pending plannings can be set to in progress');
                        }
                        break;
                    case 'completed':
                        if (planning.status !== 'in_progress') {
                            throw throwError(ErrorCodes.BAD_REQUEST, 'Only in-progress plannings can be completed');
                        }
                        break;
                }
            }

            const updatedPlanning = await this.prisma.planning.update({
                where: { planning_id: planningId },
                data: {
                    ...input,
                    updated_at: new Date(),
                },
                include: {
                    account: true,
                    production_batches: true,
                },
            });

            return this.mapPrismaPlanningToPlanning(updatedPlanning);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to update planning');
        }
    }

    async deletePlanning(planningId: string): Promise<void> {
        try {
            const planning = await this.prisma.planning.findFirst({
                where: { planning_id: planningId, is_deleted: false },
                include: {
                    production_batches: {
                        where: {
                            is_deleted: false
                        }
                    }
                }
            });

            if (!planning) {
                throw throwError(ErrorCodes.NOT_FOUND, 'Planning not found');
            }

            if (planning.production_batches.length > 0) {
                throw throwError(ErrorCodes.BAD_REQUEST, 'Cannot delete planning with active production batches');
            }

            if (planning.status !== 'pending') {
                throw throwError(ErrorCodes.BAD_REQUEST, 'Only pending plannings can be deleted');
            }

            await this.prisma.planning.update({
                where: { planning_id: planningId },
                data: {
                    is_deleted: true,
                    updated_at: new Date(),
                },
            });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to delete planning');
        }
    }

    private mapPrismaPlanningToPlanning(p: any): Planning {
        return {
            planning_id: p.planning_id,
            name: p.name,
            description: p.description,
            status: p.status,
            start_date: p.start_date,
            end_date: p.end_date,
            created_by: p.created_by,
            created_at: p.created_at,
            updated_at: p.updated_at,
            is_deleted: p.is_deleted,
        };
    }
}
