import { z } from 'zod';

export const hourlyValueSchema = z.object({
    body: z.object({
        device_serial: z.string().min(1, 'Device serial is required').max(50),
        space_id: z.number().positive('Space ID must be a positive number').optional(),
        hour_timestamp: z.string().datetime().optional(),
        avg_value: z.record(z.number().nullable()).optional(), // Dynamic key-value pairs for sensor data
        sample_count: z.number().int().min(0).optional(),
    }),
});

export const updateHourlyValueSchema = z.object({
    body: z.object({
        avg_value: z.record(z.number().nullable()).optional(),
        sample_count: z.number().int().min(0).optional(),
    }),
});

export const hourlyValueIdSchema = z.object({
    params: z.object({
        hourlyValueId: z
            .string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'Hourly Value ID must be a positive number'),
    }),
});

export const hourlyValueFilterSchema = z.object({
    query: z.object({
        device_serial: z.string().max(50, 'Device serial must be 50 characters or less').optional(),
        space_id: z
            .string()
            .transform((val) => (val ? parseInt(val) : undefined))
            .refine((val) => !val || val > 0, 'Space ID must be a positive number')
            .optional(),
        start_time: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
        end_time: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
        page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
        limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
    }),
});

export type HourlyValueInput = z.infer<typeof hourlyValueSchema>['body'];
export type UpdateHourlyValueInput = z.infer<typeof updateHourlyValueSchema>['body'];
export type HourlyValueIdInput = z.infer<typeof hourlyValueIdSchema>['params'];
export type HourlyValueFilterInput = z.infer<typeof hourlyValueFilterSchema>['query'];
