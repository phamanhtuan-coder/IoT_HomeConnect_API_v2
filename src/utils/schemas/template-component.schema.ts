import { z } from 'zod';

export const templateComponentSchema = z.object({
    body: z.object({
        template_id: z.number().positive('Template ID must be a positive number'),
        component_id: z.number().positive('Component ID must be a positive number'),
        quantity_required: z.number().positive('Quantity required must be a positive number').default(1),
    }),
});

export const templateComponentIdSchema = z.object({
    params: z.object({
        templateComponentId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'Template Component ID must be a positive number'),
    }),
});

export type TemplateComponentInput = z.infer<typeof templateComponentSchema>['body'];
export type TemplateComponentIdInput = z.infer<typeof templateComponentIdSchema>['params'];