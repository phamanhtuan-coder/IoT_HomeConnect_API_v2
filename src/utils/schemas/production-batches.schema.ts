import { z } from 'zod';
import { ERROR_CODES, ERROR_MESSAGES } from '../../contants/error';

// Enum cho trạng thái batch
const BatchStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
} as const;

// Schema cơ bản cho template_id
const TemplateIdSchema = z.number({
    required_error: `[${ERROR_CODES.PRODUCTION_BATCH_TEMPLATE_ID_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_TEMPLATE_ID_REQUIRED]}`,
    invalid_type_error: `[${ERROR_CODES.PRODUCTION_BATCH_TEMPLATE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_TEMPLATE_ID_INVALID]}`
}).positive(`[${ERROR_CODES.PRODUCTION_BATCH_TEMPLATE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_TEMPLATE_ID_INVALID]}`);

// Schema cơ bản cho quantity
const QuantitySchema = z.number({
    required_error: `[${ERROR_CODES.PRODUCTION_BATCH_QUANTITY_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_QUANTITY_REQUIRED]}`,
    invalid_type_error: `[${ERROR_CODES.PRODUCTION_BATCH_QUANTITY_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_QUANTITY_INVALID]}`
}).positive(`[${ERROR_CODES.PRODUCTION_BATCH_QUANTITY_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_QUANTITY_INVALID]}`);

// Schema cho việc tạo mới batch
export const ProductionBatchCreateSchema = z.object({
    body: z.object({
        template_id: TemplateIdSchema,
        quantity: QuantitySchema
    })
});

// Schema cho việc cập nhật batch
export const ProductionBatchUpdateSchema = z.object({
    params: z.object({
        batchId: z.string({
            required_error: `[${ERROR_CODES.PRODUCTION_BATCH_ID_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_ID_REQUIRED]}`
        })
        .transform((val) => parseInt(val))
        .refine(
            (val) => val > 0,
            `[${ERROR_CODES.PRODUCTION_BATCH_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_ID_INVALID]}`
        )
    }),
    body: z.object({
        template_id: TemplateIdSchema.optional(),
        quantity: QuantitySchema.optional(),
        status: z.enum([
            BatchStatus.PENDING,
            BatchStatus.APPROVED,
            BatchStatus.REJECTED,
            BatchStatus.IN_PROGRESS,
            BatchStatus.COMPLETED
        ], {
            errorMap: () => ({
                message: `[${ERROR_CODES.PRODUCTION_BATCH_STATUS_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_STATUS_INVALID]}`
            })
        }).optional()
    }).refine(
        (data) => {
            // Kiểm tra nếu có ít nhất một trường được cập nhật
            return Object.keys(data).length > 0;
        },
        {
            message: `[${ERROR_CODES.PRODUCTION_BATCH_UPDATE_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_UPDATE_INVALID]}`
        }
    )
});

// Schema cho việc lấy batch theo ID
export const ProductionBatchIdSchema = z.object({
    params: z.object({
        batchId: z.string({
            required_error: `[${ERROR_CODES.PRODUCTION_BATCH_ID_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_ID_REQUIRED]}`
        })
        .transform((val) => parseInt(val))
        .refine(
            (val) => val > 0,
            `[${ERROR_CODES.PRODUCTION_BATCH_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_ID_INVALID]}`
        )
    })
});

// Schema cho việc xóa batch
export const ProductionBatchDeleteSchema = ProductionBatchIdSchema;

// Schema cho việc lấy danh sách batch
export const ProductionBatchListSchema = z.object({
    query: z.object({
        status: z.enum([
            BatchStatus.PENDING,
            BatchStatus.APPROVED,
            BatchStatus.REJECTED,
            BatchStatus.IN_PROGRESS,
            BatchStatus.COMPLETED
        ], {
            errorMap: () => ({
                message: `[${ERROR_CODES.PRODUCTION_BATCH_STATUS_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_STATUS_INVALID]}`
            })
        }).optional(),
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
export type ProductionBatchCreateInput = z.infer<typeof ProductionBatchCreateSchema>['body'];
export type ProductionBatchUpdateInput = z.infer<typeof ProductionBatchUpdateSchema>['body'];
export type ProductionBatchIdParam = z.infer<typeof ProductionBatchIdSchema>['params'];
export type ProductionBatchListQuery = z.infer<typeof ProductionBatchListSchema>['query'];
export type BatchStatus = typeof BatchStatus[keyof typeof BatchStatus];

// Export enum
export { BatchStatus };