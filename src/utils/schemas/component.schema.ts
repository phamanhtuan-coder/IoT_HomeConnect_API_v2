import { z } from 'zod';

export const componentSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Component name is required').max(100),
        supplier: z.string().max(100).optional(),
        quantity_in_stock: z.number().int().min(0, 'Quantity must be non-negative').optional(),
        unit_cost: z.number().min(0, 'Unit cost must be non-negative').optional(),
    }),
});

export const componentIdSchema = z.object({
    params: z.object({
        componentId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'Component ID must be a positive number'),
    }),
});

export const updateComponentSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Component name is required').max(100).optional(),
        supplier: z.string().max(100).optional().nullable(),
        quantity_in_stock: z.number().int().min(0, 'Quantity must be non-negative').optional(),
        unit_cost: z.number().min(0, 'Unit cost must be non-negative').optional(),
    }),
});

export type ComponentInput = z.infer<typeof componentSchema>['body'];
export type ComponentIdInput = z.infer<typeof componentIdSchema>['params'];
export type UpdateComponentInput = z.infer<typeof updateComponentSchema>['body'];