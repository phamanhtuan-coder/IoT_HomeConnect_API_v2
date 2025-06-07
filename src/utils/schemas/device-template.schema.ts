import { z } from 'zod';
import { ERROR_CODES, ERROR_MESSAGES } from '../../contants/error';

// Schema cơ bản cho tên template
const TemplateNameSchema = z.string({
    required_error: `[${ERROR_CODES.DEVICE_TEMPLATE_NAME_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_NAME_REQUIRED]}`,
    invalid_type_error: `[${ERROR_CODES.DEVICE_TEMPLATE_NAME_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_NAME_INVALID]}`
}).min(1, `[${ERROR_CODES.DEVICE_TEMPLATE_NAME_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_NAME_INVALID]}`);

// Schema cơ bản cho component
const ComponentSchema = z.object({
    component_id: z.number({
        required_error: `[${ERROR_CODES.DEVICE_TEMPLATE_COMPONENT_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_COMPONENT_REQUIRED]}`,
        invalid_type_error: `[${ERROR_CODES.DEVICE_TEMPLATE_COMPONENT_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_COMPONENT_INVALID]}`
    }).positive(`[${ERROR_CODES.DEVICE_TEMPLATE_COMPONENT_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_COMPONENT_INVALID]}`),
    quantity_required: z.number({
        invalid_type_error: `[${ERROR_CODES.DEVICE_TEMPLATE_COMPONENT_QUANTITY_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_COMPONENT_QUANTITY_INVALID]}`
    })
    .positive(`[${ERROR_CODES.DEVICE_TEMPLATE_COMPONENT_QUANTITY_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_COMPONENT_QUANTITY_INVALID]}`)
    .default(1)
});

// Schema cho việc tạo mới device template
export const DeviceTemplateCreateSchema = z.object({
    body: z.object({
        device_type_id: z.number().positive('Device type ID must be a positive number').optional(),
        name: z.string().min(1, 'Template name is required').max(100, 'Template name must be 100 characters or less'),
        production_cost: z.number().optional(),
        status: z.string().optional(),
        components: z.array(ComponentSchema).optional().default([]), // Sửa từ "component" thành "components" để rõ ràng hơn
    }),
});

// Schema cho việc cập nhật device template
export const DeviceTemplateUpdateSchema = z.object({
    params: z.object({
        templateId: z.string({
            required_error: `[${ERROR_CODES.DEVICE_TEMPLATE_ID_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_ID_REQUIRED]}`
        })
        .transform((val) => parseInt(val))
        .refine((val) => val > 0, `[${ERROR_CODES.DEVICE_TEMPLATE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_ID_INVALID]}`)
    }),
    body: z.object({
        device_type_id: z.number({
            invalid_type_error: `[${ERROR_CODES.DEVICE_TEMPLATE_TYPE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_TYPE_ID_INVALID]}`
        }).positive(`[${ERROR_CODES.DEVICE_TEMPLATE_TYPE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_TYPE_ID_INVALID]}`).optional(),
        name: TemplateNameSchema.optional(),
        production_cost: z.number({
            invalid_type_error: `[${ERROR_CODES.DEVICE_TEMPLATE_PRODUCTION_COST_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_PRODUCTION_COST_INVALID]}`
        }).positive(`[${ERROR_CODES.DEVICE_TEMPLATE_PRODUCTION_COST_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_PRODUCTION_COST_INVALID]}`).optional(),
        components: z.array(ComponentSchema).optional(),
        device_template_note: z.string({
            invalid_type_error: `[${ERROR_CODES.DEVICE_TEMPLATE_NOTE_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_NOTE_INVALID]}`
        }).optional()
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

// Schema cho việc xóa device template
export const DeviceTemplateDeleteSchema = z.object({
    params: z.object({
        templateId: z.string({
            required_error: `[${ERROR_CODES.DEVICE_TEMPLATE_ID_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_ID_REQUIRED]}`
        })
        .transform((val) => parseInt(val))
        .refine((val) => val > 0, `[${ERROR_CODES.DEVICE_TEMPLATE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_ID_INVALID]}`)
    })
});

// Schema cho việc lấy device template theo ID
export const DeviceTemplateIdSchema = DeviceTemplateDeleteSchema;

// Schema cho việc lấy danh sách device template
export const DeviceTemplateListSchema = z.object({
    query: z.object({
        device_type_id: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, `[${ERROR_CODES.DEVICE_TEMPLATE_TYPE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_TEMPLATE_TYPE_ID_INVALID]}`)
            .optional(),
        search: z.string().optional(),
        page: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'Page number must be positive')
            .optional(),
        limit: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100')
            .optional(),
        sort_by: z.enum(['name', 'device_type_id', 'production_cost', 'created_at', 'updated_at']).optional(),
        sort_order: z.enum(['asc', 'desc']).optional()
    })
});

// Types từ schema
export type DeviceTemplateCreateInput = z.infer<typeof DeviceTemplateCreateSchema>['body'];
export type DeviceTemplateUpdateInput = z.infer<typeof DeviceTemplateUpdateSchema>['body'];
export type DeviceTemplateIdParam = z.infer<typeof DeviceTemplateIdSchema>['params'];
export type DeviceTemplateListQuery = z.infer<typeof DeviceTemplateListSchema>['query'];
export type ComponentInput = z.infer<typeof ComponentSchema>;