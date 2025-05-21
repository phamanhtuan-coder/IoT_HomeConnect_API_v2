import { z } from 'zod';

export const deviceTemplateSchema = z.object({
    body: z.object({
        device_type_id: z.number().positive('Device type ID must be a positive number').optional(),
        name: z.string().min(1, 'Template name is required').max(100, 'Template name must be 100 characters or less'),
    }),
});

export const deviceTemplateIdSchema = z.object({
    params: z.object({
        templateId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'Template ID must be a positive number'),
    }),
});

export type DeviceTemplateInput = z.infer<typeof deviceTemplateSchema>['body'];
export type DeviceTemplateIdInput = z.infer<typeof deviceTemplateIdSchema>['params'];