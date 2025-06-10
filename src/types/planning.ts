// src/types/planning.ts
import { planning, production_batches } from '@prisma/client';

export type PlanningStatus = 'pending' | 'pendingimport' | 'rejected' | 'in_progress' | 'completed' | 'fix';
export type BatchStatus = 'pending' | 'pendingimport' | 'in_progress' | 'completed' | 'relabeling' | 'fixproduction' | 'rejected' | 'cancelled' | 'expired';

export interface Planning extends planning {
    production_batches?: ProductionBatch[];
}

export interface ProductionBatch extends production_batches {
    device_templates?: any; // Replace with proper type from prisma
}

export interface PlanningCreateInput {
    planning_note?: string;
    batch_count: number;
}

export interface BatchCreateInput {
    template_id: string;
    quantity: number;
    batch_note?: string;
    firmware_id?: string;
}

export interface PlanningApprovalInput {
    status: 'approved' | 'rejected';
    notes: string;
}

export interface BatchUpdateInput {
    status: BatchStatus;
    batch_note?: string;
}

export interface PlanningResponse {
    success: boolean;
    data?: Planning | Planning[];
    message?: string;
    error?: string;
}

export interface BatchResponse {
    success: boolean;
    data?: ProductionBatch | ProductionBatch[];
    message?: string;
    error?: string;
}