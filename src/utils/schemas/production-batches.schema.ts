import { z } from 'zod';

// Schema cho việc tạo mới batch
export const productionBatchCreateSchema = z.object({
    body: z.object({
        template_id: z.number({
            required_error: 'Template ID is required',
            invalid_type_error: 'Template ID must be a number',
        }).positive('Template ID must be positive'),
        quantity: z.number({
            required_error: 'Quantity is required',
            invalid_type_error: 'Quantity must be a number',
        }).positive('Quantity must be positive'),
    }),
});

// Schema cho việc cập nhật batch
export const productionBatchUpdateSchema = z.object({
    params: z.object({
        batchId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'Batch ID must be a positive number'),
    }),
    body: z.object({
        template_id: z.number()
            .positive('Template ID must be positive')
            .optional(),
        quantity: z.number()
            .positive('Quantity must be positive')
            .optional(),
        status: z.enum(['pending', 'approved', 'rejected', 'in_progress', 'completed'])
            .optional()
            .refine((val) => {
                if (!val) return true;
                return ['pending', 'approved', 'rejected', 'in_progress', 'completed'].includes(val);
            }, {
                message: "Status must be one of: 'pending', 'approved', 'rejected', 'in_progress', 'completed'",
            }),
    }),
});

// Schema cho việc lấy batch theo ID
export const productionBatchIdSchema = z.object({
    params: z.object({
        batchId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'Batch ID must be a positive number'),
    }),
});

// Types từ schema
export type ProductionBatchCreateInput = z.infer<typeof productionBatchCreateSchema>['body'];
export type ProductionBatchUpdateInput = z.infer<typeof productionBatchUpdateSchema>['body'];
export type ProductionBatchIdParam = z.infer<typeof productionBatchIdSchema>['params'];
