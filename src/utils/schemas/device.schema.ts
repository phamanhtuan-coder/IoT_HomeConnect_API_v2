import { z } from 'zod';
import {ERROR_CODES, ERROR_MESSAGES} from "../../contants/error";

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
        deviceId: z.string().min(1, 'Device ID is required')
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

// New unified state management schemas
export const DeviceStateUpdateSchema = z.object({
    body: z.object({
        serial_number: z.string({
            required_error: `[${ERROR_CODES.DEVICE_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`),

        power_status: z.boolean().optional(),

        brightness: z.number()
            .min(0, `[${ERROR_CODES.DEVICE_BRIGHTNESS_INVALID}]Brightness must be between 0 and 100`)
            .max(100, `[${ERROR_CODES.DEVICE_BRIGHTNESS_INVALID}]Brightness must be between 0 and 100`)
            .optional(),

        color: z.string()
            .regex(/^#[0-9A-Fa-f]{6}$/, `[${ERROR_CODES.DEVICE_COLOR_INVALID}]Color must be in hex format (#RRGGBB)`)
            .optional(),

        alarmActive: z.boolean().optional(),
        buzzerOverride: z.boolean().optional(),

        wifi_ssid: z.string()
            .min(1, `[${ERROR_CODES.DEVICE_WIFI_SSID_INVALID}]WiFi SSID cannot be empty`)
            .max(32, `[${ERROR_CODES.DEVICE_WIFI_SSID_INVALID}]WiFi SSID too long`)
            .optional(),

        wifi_password: z.string()
            .min(8, `[${ERROR_CODES.DEVICE_WIFI_PASSWORD_INVALID}]WiFi password must be at least 8 characters`)
            .max(64, `[${ERROR_CODES.DEVICE_WIFI_PASSWORD_INVALID}]WiFi password too long`)
            .optional(),
    })
});

export const DeviceStateQuerySchema = z.object({
    params: z.object({
        deviceId: z.string({
            required_error: `[${ERROR_CODES.DEVICE_ID_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_ID_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_ID_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_ID_INVALID]}`),
    }),
    query: z.object({
        serial_number: z.string({
            required_error: `[${ERROR_CODES.DEVICE_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`),
    })
});

export const DeviceBulkStateSchema = z.object({
    body: z.object({
        serial_number: z.string({
            required_error: `[${ERROR_CODES.DEVICE_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`),

        updates: z.array(z.object({
            power_status: z.boolean().optional(),
            brightness: z.number().min(0).max(100).optional(),
            color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
            alarmActive: z.boolean().optional(),
            buzzerOverride: z.boolean().optional(),
            wifi_ssid: z.string().min(1).max(32).optional(),
            wifi_password: z.string().min(8).max(64).optional(),
        })).min(1, `[${ERROR_CODES.DEVICE_UPDATES_REQUIRED}]Updates array cannot be empty`),
    })
});

export const QuickToggleSchema = z.object({
    body: z.object({
        serial_number: z.string({
            required_error: `[${ERROR_CODES.DEVICE_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`),

        power_status: z.boolean().optional(),
    })
});

export const DeviceCapabilitiesSchema = z.object({
    params: z.object({
        deviceId: z.string({
            required_error: `[${ERROR_CODES.DEVICE_ID_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_ID_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_ID_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_ID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_ID_INVALID]}`),
    }),
    body: z.object({
        serial_number: z.string({
            required_error: `[${ERROR_CODES.DEVICE_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`),
    })
});

export const UpdateDeviceCapabilitiesSchema = z.object({
    body: z.object({
        serial_number: z.string({
            required_error: `[${ERROR_CODES.DEVICE_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`),

        capabilities: z.object({
            deviceType: z.string().optional(),
            category: z.string().optional(),
            capabilities: z.array(z.string()).optional(),
            hardware_version: z.string().optional(),
            firmware_version: z.string().optional(),
            isInput: z.boolean().optional(),
            isOutput: z.boolean().optional(),
            isSensor: z.boolean().optional(),
            isActuator: z.boolean().optional(),
            controls: z.record(z.string()).optional(),
        }).refine(
            (data) => Object.keys(data).length > 0,
            `[${ERROR_CODES.DEVICE_CAPABILITIES_INVALID}]Capabilities object cannot be empty`
        )
    })
});

export type UpdateDeviceCapabilitiesInput = z.infer<typeof UpdateDeviceCapabilitiesSchema>['body'];
export type DeviceStateUpdateInput = z.infer<typeof DeviceStateUpdateSchema>['body'];
export type DeviceStateQueryInput = z.infer<typeof DeviceStateQuerySchema>;
export type DeviceBulkStateInput = z.infer<typeof DeviceBulkStateSchema>['body'];
export type QuickToggleInput = z.infer<typeof QuickToggleSchema>['body'];
export type DeviceCapabilitiesInput = z.infer<typeof DeviceCapabilitiesSchema>;

export type DeviceInput = z.infer<typeof deviceSchema>['body'];
export type DeviceIdInput = z.infer<typeof deviceIdSchema>['params'];
export type LinkDeviceInput = z.infer<typeof linkDeviceSchema>['body'];
export type ToggleDeviceInput = z.infer<typeof toggleDeviceSchema>['body'];
export type UpdateAttributesInput = z.infer<typeof updateAttributesSchema>['body'];
export type UpdateWifiInput = z.infer<typeof updateWifiSchema>['body'];
export type DeviceSerialInput = z.infer<typeof deviceSerialSchema>['params'];
export type UserDeviceIdInput = z.infer<typeof userDeviceIdSchema>['params'];
export type DeviceIdForRevokeInput = z.infer<typeof deviceIdForRevokeSchema>['params'];
