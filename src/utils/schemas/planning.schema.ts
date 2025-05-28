import { z } from 'zod';

// Schema cho việc tạo mới planning
export const planningCreateSchema = z.object({
    body: z.object({
        name: z.string({
            required_error: 'Name is required',
            invalid_type_error: 'Name must be a string',
        }).min(1, 'Name cannot be empty'),
        description: z.string().optional(),
        start_date: z.string()
            .transform((val) => new Date(val))
            .optional(),
        end_date: z.string()
            .transform((val) => new Date(val))
            .optional(),
    }).refine((data) => {
        if (data.start_date && data.end_date) {
            return data.start_date <= data.end_date;
        }
        return true;
    }, {
        message: "End date must be after start date",
    }),
});

// Schema cho việc cập nhật planning
export const planningUpdateSchema = z.object({
    params: z.object({
        planningId: z.string({
            required_error: 'Planning ID is required',
            invalid_type_error: 'Planning ID must be a string',
        }),
    }),
    body: z.object({
        name: z.string().min(1, 'Name cannot be empty').optional(),
        description: z.string().optional(),
        status: z.enum(['pending', 'in_progress', 'completed']).optional(),
        start_date: z.string()
            .transform((val) => new Date(val))
            .optional(),
        end_date: z.string()
            .transform((val) => new Date(val))
            .optional(),
    }).refine((data) => {
        if (data.start_date && data.end_date) {
            return data.start_date <= data.end_date;
        }
        return true;
    }, {
        message: "End date must be after start date",
    }),
});

// Schema cho việc lấy planning theo ID
export const planningIdSchema = z.object({
    params: z.object({
        planningId: z.string({
            required_error: 'Planning ID is required',
            invalid_type_error: 'Planning ID must be a string',
        }),
    }),
});

// Types từ schema
export type PlanningCreateInput = z.infer<typeof planningCreateSchema>['body'];
export type PlanningUpdateInput = z.infer<typeof planningUpdateSchema>['body'];
export type PlanningIdParam = z.infer<typeof planningIdSchema>['params'];
