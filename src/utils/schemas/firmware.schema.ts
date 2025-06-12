import { z } from 'zod';

// Schema cho việc tạo firmware mới
export const firmwareSchema = z.object({
    body: z.object({
        version: z.string({
            required_error: 'Phiên bản firmware là bắt buộc',
            invalid_type_error: 'Phiên bản firmware phải là chuỗi'
        }),
        name: z.string({
            required_error: 'Tên firmware là bắt buộc',
            invalid_type_error: 'Tên firmware phải là chuỗi'
        }),
        file_path: z.string({
            required_error: `[${ERROR_CODES.FIRMWARE_FILE_PATH_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_FILE_PATH_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.FIRMWARE_FILE_PATH_INVALID}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_FILE_PATH_INVALID]}`
        }),
        is_mandatory: z.boolean().optional(),
        note: z.string().optional()
    })
});

// Schema cho việc cập nhật firmware
export const updateFirmwareSchema = z.object({
    params: z.object({
        firmwareId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'ID firmware phải là số dương')
    }),
    body: z.object({
        version: z.string({
            required_error: 'Phiên bản firmware là bắt buộc',
            invalid_type_error: 'Phiên bản firmware phải là chuỗi'
        }),
        name: z.string({
            required_error: 'Tên firmware là bắt buộc',
            invalid_type_error: 'Tên firmware phải là chuỗi'
        }),
        template_id: z.number({
            required_error: 'ID template là bắt buộc',
            invalid_type_error: 'ID template phải là số'
        }),
        is_mandatory: z.boolean({
            required_error: 'Trạng thái bắt buộc là bắt buộc',
            invalid_type_error: 'Trạng thái bắt buộc phải là boolean'
        }),
        note: z.string().optional()
    })
});

// Schema cho việc xác thực firmware ID
export const firmwareIdSchema = z.object({
    params: z.object({
        firmwareId: z.string().optional()
    })
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


// Export các type từ schema
export type FirmwareInput = z.infer<typeof firmwareSchema>['body'];
export type UpdateFirmwareInput = z.infer<typeof updateFirmwareSchema>['body'];
export type FirmwareIdInput = z.infer<typeof firmwareIdSchema>['params'];

export type FirmwareUpdateHistoryInput = z.infer<typeof firmwareUpdateHistorySchema>['body'];
export type UpdateFirmwareUpdateHistoryInput = z.infer<typeof updateFirmwareUpdateHistorySchema>['body'];
export type FirmwareUpdateHistoryIdInput = z.infer<typeof firmwareUpdateHistoryIdSchema>['params'];
export type FirmwareUpdateHistoryFilterInput = z.infer<typeof firmwareUpdateHistoryFilterSchema>['query'];