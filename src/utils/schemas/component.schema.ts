import { z } from 'zod';
import { ERROR_CODES, ERROR_MESSAGES } from '../../contants/error';

// Schema cơ bản cho tên component
const ComponentNameSchema = z.string({
    required_error: `[${ERROR_CODES.COMPONENT_NAME_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.COMPONENT_NAME_REQUIRED]}`,
    invalid_type_error: `[${ERROR_CODES.COMPONENT_NAME_INVALID}]${ERROR_MESSAGES[ERROR_CODES.COMPONENT_NAME_INVALID]}`
}).min(1, `[${ERROR_CODES.COMPONENT_NAME_INVALID}]${ERROR_MESSAGES[ERROR_CODES.COMPONENT_NAME_INVALID]}`);

// Schema cơ bản cho giá đơn vị
const UnitCostSchema = z.number({
    invalid_type_error: `[${ERROR_CODES.COMPONENT_UNIT_COST_INVALID}]${ERROR_MESSAGES[ERROR_CODES.COMPONENT_UNIT_COST_INVALID]}`
})
.positive(`[${ERROR_CODES.COMPONENT_UNIT_COST_INVALID}]${ERROR_MESSAGES[ERROR_CODES.COMPONENT_UNIT_COST_INVALID]}`)
.optional();

// Schema cho việc tạo mới component
export const ComponentCreateSchema = z.object({
    body: z.object({
        name: ComponentNameSchema,
        supplier: z.string({
            invalid_type_error: `[${ERROR_CODES.COMPONENT_SUPPLIER_INVALID}]${ERROR_MESSAGES[ERROR_CODES.COMPONENT_SUPPLIER_INVALID]}`
        }).optional(),
        unit_cost: UnitCostSchema,
        status: z.boolean({
            invalid_type_error: `[${ERROR_CODES.COMPONENT_STATUS_INVALID}]${ERROR_MESSAGES[ERROR_CODES.COMPONENT_STATUS_INVALID]}`
        }).optional()
    })
});

// Schema cho việc cập nhật component
export const ComponentUpdateSchema = z.object({
    params: z.object({
        componentId: z.string({
            required_error: `[${ERROR_CODES.COMPONENT_ID_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.COMPONENT_ID_REQUIRED]}`
        })
        .transform((val) => parseInt(val))
        .refine((val) => val > 0, `[${ERROR_CODES.COMPONENT_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.COMPONENT_ID_INVALID]}`)
    }),
    body: z.object({
        name: ComponentNameSchema.optional(),
        supplier: z.string({
            invalid_type_error: `[${ERROR_CODES.COMPONENT_SUPPLIER_INVALID}]${ERROR_MESSAGES[ERROR_CODES.COMPONENT_SUPPLIER_INVALID]}`
        }).nullable().optional(),
        unit_cost: UnitCostSchema,
        status: z.boolean({
            invalid_type_error: `[${ERROR_CODES.COMPONENT_STATUS_INVALID}]${ERROR_MESSAGES[ERROR_CODES.COMPONENT_STATUS_INVALID]}`
        }).nullable().optional()
    }).refine(
        (data) => {
            // Kiểm tra nếu có ít nhất một trường được cập nhật
            return Object.keys(data).length > 0;
        },
        {
            message: 'Phải cập nhật ít nhất một trường'
        }
    )
});

// Schema cho việc xóa component
export const ComponentDeleteSchema = z.object({
    params: z.object({
        componentId: z.string({
            required_error: `[${ERROR_CODES.COMPONENT_ID_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.COMPONENT_ID_REQUIRED]}`
        })
        .transform((val) => parseInt(val))
        .refine((val) => val > 0, `[${ERROR_CODES.COMPONENT_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.COMPONENT_ID_INVALID]}`)
    })
});

// Schema cho việc lấy component theo ID
export const ComponentIdSchema = ComponentDeleteSchema;

// Schema cho việc lấy danh sách component
export const ComponentListSchema = z.object({
    query: z.object({
        status: z.enum(['true', 'false'])
            .transform((val) => val === 'true')
            .optional(),
        supplier: z.string().optional(),
        search: z.string().optional(),
        page: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'Page number must be positive')
            .optional(),
        limit: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100')
            .optional(),
        sort_by: z.enum(['name', 'supplier', 'unit_cost', 'created_at', 'updated_at']).optional(),
        sort_order: z.enum(['asc', 'desc']).optional()
    })
});

// Types từ schema
export type ComponentCreateInput = z.infer<typeof ComponentCreateSchema>['body'];
export type ComponentUpdateInput = z.infer<typeof ComponentUpdateSchema>['body'];
export type ComponentIdParam = z.infer<typeof ComponentIdSchema>['params'];
export type ComponentListQuery = z.infer<typeof ComponentListSchema>['query'];