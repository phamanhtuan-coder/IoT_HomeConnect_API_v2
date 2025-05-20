import { z } from 'zod';

export const deviceSchema = z.object({
    body: z.object({
        templateId: z.number().positive('Template ID must be a positive number'),
        serial_number: z.string().min(1, 'Serial number is required').max(50),
        spaceId: z.number().positive('Space ID must be a positive number').optional(),
        name: z.string().min(1, 'Device name is required').max(100),
        attribute: z.record(z.any()).optional(),
        wifi_ssid: z.string().max(50).optional(),
        wifi_password: z.string().max(50).optional(),
    }),
});

export const deviceIdSchema = z.object({
    params: z.object({
        deviceId: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'Device ID must be a positive number'),
    }),
});

export const deviceSerialSchema = z.object({
    params: z.object({
        device_serial: z.string().min(1, 'Serial number is required').max(50),
    }),
});

export const linkDeviceSchema = z.object({
    body: z.object({
        serial_number: z.string().min(1, 'Serial number is required').max(50),
        spaceId: z.number().positive('Space ID must be a positive number').optional(),
        name: z.string().min(1, 'Device name is required').max(100),
    }),
});

export const toggleDeviceSchema = z.object({
    body: z.object({
        power_status: z.boolean(),
    }),
});

export const updateAttributesSchema = z.object({
    body: z.object({
        brightness: z.number().min(0).max(100).optional(),
        color: z.string().max(50).optional(),
    }),
});

export const updateWifiSchema = z.object({
    body: z.object({
        wifi_ssid: z.string().max(50).optional(),
        wifi_password: z.string().max(50).optional(),
    }),
});

export const userDeviceIdSchema = z.object({
    params: z.object({
        userId: z.string().min(1, 'User ID is required')
    })
});

export const deviceIdForRevokeSchema = z.object({
    params: z.object({
        deviceId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'Device ID must be a positive number')
    })
});

export type DeviceInput = z.infer<typeof deviceSchema>['body'];
export type DeviceIdInput = z.infer<typeof deviceIdSchema>['params'];
export type LinkDeviceInput = z.infer<typeof linkDeviceSchema>['body'];
export type ToggleDeviceInput = z.infer<typeof toggleDeviceSchema>['body'];
export type UpdateAttributesInput = z.infer<typeof updateAttributesSchema>['body'];
export type UpdateWifiInput = z.infer<typeof updateWifiSchema>['body'];
export type DeviceSerialInput = z.infer<typeof deviceSerialSchema>['params'];
export type UserDeviceIdInput = z.infer<typeof userDeviceIdSchema>['params'];
export type DeviceIdForRevokeInput = z.infer<typeof deviceIdForRevokeSchema>['params'];
