import { z } from 'zod';

// Định nghĩa schema cho từng component trong mảng
const componentSchema = z.object({
    component_id: z.number().positive('Component ID must be a positive number'),
    quantity_required: z.number().positive('Quantity required must be a positive number').optional().default(1), // Mặc định là 1 nếu không được cung cấp
});

export const deviceTemplateSchema = z.object({
    body: z.object({
        device_type_id: z.number().positive('Device type ID must be a positive number').optional(),
        name: z.string().min(1, 'Template name is required').max(100, 'Template name must be 100 characters or less'),
        components: z.array(componentSchema).optional().default([]), // Sửa từ "component" thành "components" để rõ ràng hơn
    }),
});

export const deviceTemplateIdSchema = z.object({
    params: z.object({
        templateId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'Template ID must be a positive number'),
    }),
});

export type DeviceTemplateInput = z.infer<typeof deviceTemplateSchema>['body'];
export type DeviceTemplateIdInput = z.infer<typeof deviceTemplateIdSchema>['params'];