import { z } from 'zod';

export const productionTrackingSchema = z.object({
    body: z.object({
        batch_id: z.number({
            required_error: 'Batch ID is required',
            invalid_type_error: 'Batch ID must be a number',
        }),
        device_serial: z.string({
            required_error: 'Device serial is required',
            invalid_type_error: 'Device serial must be a string',
        }),
        stage: z.enum(['assembly', 'firmware_upload', 'qc', 'packaging'], {
            required_error: 'Stage is required',
            invalid_type_error: 'Invalid stage value',
        }),
        status: z.enum(['pending', 'in_progress', 'completed', 'failed'])
            .default('pending'),
        cost: z.number().positive('Cost must be a positive number')
            .optional(),
    }),
});

export const productionTrackingIdSchema = z.object({
    params: z.object({
        productionId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'Production tracking ID must be a positive number'),
    }),
});

export type ProductionTrackingInput = z.infer<typeof productionTrackingSchema>['body'];
export type ProductionTrackingIdInput = z.infer<typeof productionTrackingIdSchema>['params'];
