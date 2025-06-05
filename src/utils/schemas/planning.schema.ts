import { z } from 'zod';
import { ERROR_CODES, ERROR_MESSAGES } from '../../contants/error';

// Enum cho trạng thái planning
const PlanningStatus = {
    APPROVED: 'approved',
    REJECTED: 'rejected'
} as const;

// Enum cho trạng thái batch
const BatchStatus = {
    PENDING: 'pending',
    PENDING_IMPORT: 'pendingimport',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    RELABELING: 'relabeling',
    FIX_PRODUCTION: 'fixproduction',
    REJECTED: 'rejected'
} as const;

// Schema cơ bản cho batch count
const BatchCountSchema = z.coerce.number({
    required_error: `[${ERROR_CODES.PLANNING_BATCH_COUNT_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_BATCH_COUNT_REQUIRED]}`,
    invalid_type_error: `[${ERROR_CODES.PLANNING_BATCH_COUNT_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_BATCH_COUNT_INVALID]}`
})
.min(1, `[${ERROR_CODES.PLANNING_BATCH_COUNT_MIN}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_BATCH_COUNT_MIN]}`)
.max(20, `[${ERROR_CODES.PLANNING_BATCH_COUNT_MAX}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_BATCH_COUNT_MAX]}`);

// Schema cho việc tạo mới planning
export const PlanningCreateSchema = z.object({
    body: z.object({
        planning_note: z.string({
            invalid_type_error: `[${ERROR_CODES.PLANNING_NOTE_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_NOTE_INVALID]}`
        }).optional(),
        batch_count: BatchCountSchema
    })
});

// Schema cho việc duyệt planning
export const PlanningApprovalSchema = z.object({
    body: z.object({
        status: z.enum([PlanningStatus.APPROVED, PlanningStatus.REJECTED], {
            required_error: `[${ERROR_CODES.PLANNING_STATUS_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_STATUS_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.PLANNING_STATUS_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_STATUS_INVALID]}`
        }),
        notes: z.string({
            required_error: `[${ERROR_CODES.PLANNING_NOTES_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_NOTES_REQUIRED]}`
        })
        .min(1, `[${ERROR_CODES.PLANNING_NOTES_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_NOTES_REQUIRED]}`)
        .max(500, `[${ERROR_CODES.PLANNING_NOTES_TOO_LONG}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_NOTES_TOO_LONG]}`)
    })
});

// Schema cho việc lấy planning theo ID
export const PlanningIdSchema = z.object({
    params: z.object({
        planningId: z.string({
            required_error: `[${ERROR_CODES.PLANNING_ID_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_ID_REQUIRED]}`
        })
        .min(1, `[${ERROR_CODES.PLANNING_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_ID_INVALID]}`)
    })
});

// Schema cho việc tạo mới batch trong planning
export const PlanningBatchCreateSchema = z.object({
    body: z.object({
        template_id: z.coerce.number({
            required_error: `[${ERROR_CODES.PRODUCTION_BATCH_TEMPLATE_ID_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_TEMPLATE_ID_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.PRODUCTION_BATCH_TEMPLATE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_TEMPLATE_ID_INVALID]}`
        }).positive(),
        quantity: z.coerce.number({
            required_error: `[${ERROR_CODES.PRODUCTION_BATCH_QUANTITY_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_QUANTITY_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.PRODUCTION_BATCH_QUANTITY_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_BATCH_QUANTITY_INVALID]}`
        }).min(1),
        batch_note: z.string({
            invalid_type_error: `[${ERROR_CODES.PLANNING_BATCH_NOTE_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_BATCH_NOTE_INVALID]}`
        }).optional()
    })
});

// Schema cho việc cập nhật batch trong planning
export const PlanningBatchUpdateSchema = z.object({
    body: z.object({
        status: z.enum([
            BatchStatus.PENDING,
            BatchStatus.PENDING_IMPORT,
            BatchStatus.IN_PROGRESS,
            BatchStatus.COMPLETED,
            BatchStatus.RELABELING,
            BatchStatus.FIX_PRODUCTION,
            BatchStatus.REJECTED
        ], {
            required_error: `[${ERROR_CODES.PLANNING_BATCH_STATUS_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_BATCH_STATUS_INVALID]}`,
            invalid_type_error: `[${ERROR_CODES.PLANNING_BATCH_STATUS_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_BATCH_STATUS_INVALID]}`
        }),
        batch_note: z.string({
            invalid_type_error: `[${ERROR_CODES.PLANNING_BATCH_NOTE_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_BATCH_NOTE_INVALID]}`
        }).optional()
    })
});

// Schema cho việc lấy danh sách planning
export const PlanningListSchema = z.object({
    query: z.object({
        status: z.enum([
            PlanningStatus.APPROVED,
            PlanningStatus.REJECTED
        ], {
            errorMap: () => ({
                message: `[${ERROR_CODES.PLANNING_STATUS_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PLANNING_STATUS_INVALID]}`
            })
        }).optional(),
        page: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'Page number must be positive')
            .optional(),
        limit: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100')
            .optional()
    })
});

// Types từ schema
export type PlanningCreateInput = z.infer<typeof PlanningCreateSchema>['body'];
export type PlanningApprovalInput = z.infer<typeof PlanningApprovalSchema>['body'];
export type PlanningIdParam = z.infer<typeof PlanningIdSchema>['params'];
export type PlanningBatchCreateInput = z.infer<typeof PlanningBatchCreateSchema>['body'];
export type PlanningBatchUpdateInput = z.infer<typeof PlanningBatchUpdateSchema>['body'];
export type PlanningListQuery = z.infer<typeof PlanningListSchema>['query'];
export type PlanningStatus = typeof PlanningStatus[keyof typeof PlanningStatus];
export type BatchStatus = typeof BatchStatus[keyof typeof BatchStatus];

// Export enums
export { PlanningStatus, BatchStatus };