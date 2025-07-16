import { z } from 'zod';

// Schema for creating device link
export const createDeviceLinkSchema = z.object({
    body: z.object({
        input_device_id: z.string().min(1, 'Input device ID is required'),
        output_device_id: z.string().min(1, 'Output device ID is required'),
        component_id: z.string().min(1, 'Component ID is required'),
        value_active: z.string().min(1, 'Value active is required'),
        logic_operator: z.enum(['AND', 'OR']).optional().default('AND'),
        output_action: z.enum(['turn_on', 'turn_off']).optional().default('turn_on'),
        output_value: z.string().optional() // Thêm field để set giá trị cho output
    })
});

// Schema for updating device link
export const updateDeviceLinkSchema = z.object({
    body: z.object({
        value_active: z.string().min(1).optional(),
        logic_operator: z.enum(['AND', 'OR']).optional(),
        component_id: z.string().min(1).optional(),
        output_action: z.enum(['turn_on', 'turn_off']).optional(),
        output_value: z.string().optional() // Thêm field để set giá trị cho output
    })
});

// Schema for device link params
export const deviceLinkParamsSchema = z.object({
    params: z.object({
        linkId: z.string().regex(/^\d+$/).transform(Number)
    })
});

// Schema for output device params
export const outputDeviceParamsSchema = z.object({
    params: z.object({
        outputDeviceId: z.string().min(1)
    })
});

// Types
export type CreateDeviceLinkInput = z.infer<typeof createDeviceLinkSchema>['body'];
export type UpdateDeviceLinkInput = z.infer<typeof updateDeviceLinkSchema>['body'];
export type DeviceLinkParams = z.infer<typeof deviceLinkParamsSchema>['params'];
export type OutputDeviceParams = z.infer<typeof outputDeviceParamsSchema>['params']; 