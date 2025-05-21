import { z } from 'zod';

export const productionComponentSchema = z.object({
    body: z.object({
        production_id: z.number().positive('Production ID must be a positive number'),
        component_id: z.number().positive('Component ID must be a positive number'),
        quantity_used: z.number().positive('Quantity used must be a positive number').default(1),
    }),
});

export const productionComponentIdSchema = z.object({
    params: z.object({
        productionComponentId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'Production Component ID must be a positive number'),
    }),
});

export type ProductionComponentInput = z.infer<typeof productionComponentSchema>['body'];
export type ProductionComponentIdInput = z.infer<typeof productionComponentIdSchema>['params'];