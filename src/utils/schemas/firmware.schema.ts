import { z } from 'zod';

export const firmwareSchema = z.object({
    body: z.object({
        version: z.string().min(1, 'Version is required').max(50, 'Version must be 50 characters or less'),
        file_path: z.string().min(1, 'File path is required').max(255, 'File path must be 255 characters or less'),
        template_id: z.number().positive('Template ID must be a positive number').optional(),
        is_mandatory: z.boolean().optional().default(false),
        note: z.string().max(5000, 'Note must be 5000 characters or less').optional(),
    }),
});

export const updateFirmwareSchema = z.object({
    body: z.object({
        version: z.string().min(1, 'Version is required').max(50, 'Version must be 50 characters or less').optional(),
        file_path: z.string().min(1, 'File path is required').max(255, 'File path must be 255 characters or less').optional(),
        template_id: z.number().positive('Template ID must be a positive number').optional(),
        is_mandatory: z.boolean().optional(),
        is_approved: z.boolean().optional(),
        tested_at: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
        note: z.string().max(5000, 'Note must be 5000 characters or less').optional(),
    }),
});

export const firmwareIdSchema = z.object({
    params: z.object({
        firmwareId: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'Firmware ID must be a positive number'),
    }),
});

export const firmwareUpdateHistorySchema = z.object({
    body: z.object({
        device_serial: z.string().min(1, 'Device serial is required').max(50, 'Device serial must be 50 characters or less'),
        firmware_id: z.number().positive('Firmware ID must be a positive number'),
        status: z.enum(['success', 'failed', 'pending']).optional().default('success'),
    }),
});

export const updateFirmwareUpdateHistorySchema = z.object({
    body: z.object({
        status: z.enum(['success', 'failed', 'pending']).optional(),
    }),
});

export const firmwareUpdateHistoryIdSchema = z.object({
    params: z.object({
        updateId: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'Update ID must be a positive number'),
    }),
});

export const firmwareUpdateHistoryFilterSchema = z.object({
    query: z.object({
        user_id: z.string().max(32, 'User ID must be 32 characters or less').optional(),
        device_serial: z.string().max(50, 'Device serial must be 50 characters or less').optional(),
        firmware_id: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'Firmware ID must be a positive number').optional(),
        created_at_start: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
        created_at_end: z.string().datetime().optional().transform((val) => (val ? new Date(val) : undefined)),
        page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
        limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
    }),
});

export type FirmwareInput = z.infer<typeof firmwareSchema>['body'];
export type UpdateFirmwareInput = z.infer<typeof updateFirmwareSchema>['body'];
export type FirmwareIdInput = z.infer<typeof firmwareIdSchema>['params'];
export type FirmwareUpdateHistoryInput = z.infer<typeof firmwareUpdateHistorySchema>['body'];
export type UpdateFirmwareUpdateHistoryInput = z.infer<typeof updateFirmwareUpdateHistorySchema>['body'];
export type FirmwareUpdateHistoryIdInput = z.infer<typeof firmwareUpdateHistoryIdSchema>['params'];
export type FirmwareUpdateHistoryFilterInput = z.infer<typeof firmwareUpdateHistoryFilterSchema>['query'];
