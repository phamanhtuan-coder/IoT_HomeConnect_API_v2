import { z } from 'zod';
import { ERROR_CODES, ERROR_MESSAGES } from '../../contants/error';

// Schema cơ bản cho version
const VersionSchema = z.string({
    required_error: `[${ERROR_CODES.FIRMWARE_VERSION_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_VERSION_REQUIRED]}`,
    invalid_type_error: `[${ERROR_CODES.FIRMWARE_VERSION_INVALID}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_VERSION_INVALID]}`
}).regex(/^\d+\.\d+\.\d+$/, `[${ERROR_CODES.FIRMWARE_VERSION_INVALID}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_VERSION_INVALID]}`);

// Schema cơ bản cho template_id
const TemplateIdSchema = z.string({
    required_error: `[${ERROR_CODES.FIRMWARE_TEMPLATE_ID_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_TEMPLATE_ID_REQUIRED]}`,
    invalid_type_error: `[${ERROR_CODES.FIRMWARE_TEMPLATE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_TEMPLATE_ID_INVALID]}`
})

// Schema cho việc tạo mới firmware
export const FirmwareCreateSchema = z.object({
    body: z.object({
        version: VersionSchema,
        name: z.string({
            required_error: `[${ERROR_CODES.FIRMWARE_NAME_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_NAME_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.FIRMWARE_NAME_INVALID}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_NAME_INVALID]}`
        }).min(1),
        file_path: z.string({
            required_error: `[${ERROR_CODES.FIRMWARE_FILE_PATH_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_FILE_PATH_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.FIRMWARE_FILE_PATH_INVALID}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_FILE_PATH_INVALID]}`
        }),
        template_id: TemplateIdSchema,
        is_mandatory: z.boolean().optional(),
        note: z.string({
            invalid_type_error: `[${ERROR_CODES.FIRMWARE_NOTE_INVALID}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_NOTE_INVALID]}`
        }).optional()
    })
});

// Schema cho việc cập nhật firmware
export const FirmwareUpdateSchema = z.object({
    params: z.object({
        firmwareId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, `[${ERROR_CODES.FIRMWARE_NOT_FOUND}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_NOT_FOUND]}`)
    }),
    body: z.object({
        version: VersionSchema,
        name: z.string({
            required_error: `[${ERROR_CODES.FIRMWARE_NAME_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_NAME_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.FIRMWARE_NAME_INVALID}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_NAME_INVALID]}`
        }).min(1),
        template_id: TemplateIdSchema,
        is_mandatory: z.boolean(),
        note: z.string({
            invalid_type_error: `[${ERROR_CODES.FIRMWARE_NOTE_INVALID}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_NOTE_INVALID]}`
        }).optional()
    })
});

// Schema cho việc xóa firmware
export const FirmwareDeleteSchema = z.object({
    params: z.object({
        firmwareId: z.string().optional()
    })
});

// Schema cho việc lấy firmware theo ID
export const FirmwareIdSchema = FirmwareDeleteSchema;

// Schema cho việc xác nhận firmware bởi tester
export const FirmwareTesterConfirmSchema = z.object({
    params: z.object({
        firmwareId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, `[${ERROR_CODES.FIRMWARE_NOT_FOUND}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_NOT_FOUND]}`)
    }),
    body: z.object({
        testResult: z.boolean({
            required_error: 'Kết quả kiểm thử là bắt buộc',
            invalid_type_error: 'Kết quả kiểm thử phải là boolean'
        })
    })
});

// Schema cho việc xác nhận firmware bởi RD
export const FirmwareRDConfirmSchema = z.object({
    params: z.object({
        firmwareId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, `[${ERROR_CODES.FIRMWARE_NOT_FOUND}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_NOT_FOUND]}`)
    }),
    body: z.object({
        testResult: z.boolean({
            required_error: 'Kết quả phê duyệt là bắt buộc',
            invalid_type_error: 'Kết quả phê duyệt phải là boolean'
        })
    })
});

// Schema cho việc lấy danh sách firmware
export const FirmwareListSchema = z.object({
    query: z.object({
        template_id: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, `[${ERROR_CODES.FIRMWARE_TEMPLATE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.FIRMWARE_TEMPLATE_ID_INVALID]}`)
            .optional(),
        is_mandatory: z.enum(['true', 'false'])
            .transform((val) => val === 'true')
            .optional(),
        is_approved: z.enum(['true', 'false'])
            .transform((val) => val === 'true')
            .optional(),
        page: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, `[${ERROR_CODES.COMMON_INVALID_PAGE}]${ERROR_MESSAGES[ERROR_CODES.COMMON_INVALID_PAGE]}`)
            .optional(),
        limit: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0 && val <= 100, `[${ERROR_CODES.COMMON_INVALID_LIMIT}]${ERROR_MESSAGES[ERROR_CODES.COMMON_INVALID_LIMIT]}`)
            .optional()
    })
});

// Types từ schema
export type FirmwareCreateInput = z.infer<typeof FirmwareCreateSchema>['body'];
export type FirmwareUpdateInput = z.infer<typeof FirmwareUpdateSchema>['body'];
export type FirmwareIdParam = z.infer<typeof FirmwareIdSchema>['params'];
export type FirmwareTesterConfirmInput = z.infer<typeof FirmwareTesterConfirmSchema>['body'];
export type FirmwareRDConfirmInput = z.infer<typeof FirmwareRDConfirmSchema>['body'];
export type FirmwareListQuery = z.infer<typeof FirmwareListSchema>['query'];