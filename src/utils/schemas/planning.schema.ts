// src/utils/schemas/planning.schema.ts
import { z } from 'zod';

export const planningCreateSchema = z.object({
    body: z.object({
    planning_note: z.string({
        invalid_type_error: 'Planning note must be a string'
    }).optional(),
    batch_count: z.coerce.number({
        required_error: 'Batch count is required',
        invalid_type_error: 'Batch count must be a number'
    }).min(1, 'Batch count must be at least 1').max(20, 'Batch count cannot exceed 20')
}),
});

export const planningApprovalSchema = z.object({
    body: z.object({
    status: z.enum(['approved', 'rejected']),
    notes: z.string().min(1, 'Notes are required').max(500, 'Notes cannot exceed 500 characters')
    }),
});

export const planningIdSchema = z.object({
    params: z.object({
        planningId: z.string().min(1)
    }),
});

export const batchCreateSchema = z.object({
    body: z.object({
    template_id: z.coerce.number(),
    quantity: z.coerce.number().min(1),
    batch_note: z.string().optional()
    }),
});

export const batchUpdateSchema = z.object({
    body: z.object({
    status: z.enum([
        'pending',
        'pendingimport',
        'in_progress',
        'completed',
        'relabeling',
        'fixproduction',
        'rejected',    
    ]),
    batch_note: z.string().optional()
    }),
});

