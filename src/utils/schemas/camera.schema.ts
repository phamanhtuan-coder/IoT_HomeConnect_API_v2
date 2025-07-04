import { z } from 'zod';
import { ERROR_CODES, ERROR_MESSAGES } from "../../contants/error";

export const cameraStreamSchema = z.object({
    params: z.object({
        serialNumber: z.string({
            required_error: `[${ERROR_CODES.DEVICE_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`),
    }),
    query: z.object({
        token: z.string().min(1, `[${ERROR_CODES.DEVICE_ATTRIBUTE_INVALID}]Stream token is required`).optional(),
    }),
});

export const capturePhotoSchema = z.object({
    params: z.object({
        serialNumber: z.string({
            required_error: `[${ERROR_CODES.DEVICE_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`),
    }),
    body: z.object({
        saveToSD: z.boolean().optional().default(true),
        quality: z.number()
            .min(5, `[${ERROR_CODES.DEVICE_ATTRIBUTE_INVALID}]Quality must be between 5 and 63`)
            .max(63, `[${ERROR_CODES.DEVICE_ATTRIBUTE_INVALID}]Quality must be between 5 and 63`)
            .optional()
            .default(10),
    }),
});

export const cameraControlSchema = z.object({
    params: z.object({
        serialNumber: z.string({
            required_error: `[${ERROR_CODES.DEVICE_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`),
    }),
    body: z.object({
        action: z.string({
            required_error: `[${ERROR_CODES.DEVICE_ATTRIBUTE_INVALID}]Action is required`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_ATTRIBUTE_INVALID}]Invalid action`
        }).min(1),
        params: z.any().optional(), // Allow any params since they vary by action
    }),
});

export const cameraConfigSchema = z.object({
    params: z.object({
        serialNumber: z.string({
            required_error: `[${ERROR_CODES.DEVICE_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`),
    }),
    body: z.object({
        resolution: z.enum(['QVGA', 'CIF', 'VGA', 'SVGA', 'XGA', 'SXGA', 'UXGA'], {
            errorMap: () => ({
                message: `[${ERROR_CODES.DEVICE_ATTRIBUTE_INVALID}]Invalid resolution`
            })
        }).optional(),
        quality: z.number()
            .min(5, `[${ERROR_CODES.DEVICE_ATTRIBUTE_INVALID}]Quality must be between 5 and 63`)
            .max(63, `[${ERROR_CODES.DEVICE_ATTRIBUTE_INVALID}]Quality must be between 5 and 63`)
            .optional(),
        motionDetection: z.boolean().optional(),
        wifi_ssid: z.string()
            .min(1, `[${ERROR_CODES.DEVICE_WIFI_SSID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_WIFI_SSID_INVALID]}`)
            .max(32, `[${ERROR_CODES.DEVICE_WIFI_SSID_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_WIFI_SSID_INVALID]}`)
            .optional(),
        wifi_password: z.string()
            .min(8, `[${ERROR_CODES.DEVICE_WIFI_PASSWORD_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_WIFI_PASSWORD_INVALID]}`)
            .max(64, `[${ERROR_CODES.DEVICE_WIFI_PASSWORD_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_WIFI_PASSWORD_INVALID]}`)
            .optional(),
    }).refine(
        (data) => Object.keys(data).length > 0, // Ensure at least one config field
        `[${ERROR_CODES.DEVICE_ATTRIBUTE_INVALID}]At least one configuration parameter is required`
    ),
});

export const cameraParamSchema = z.object({
    params: z.object({
        serialNumber: z.string({
            required_error: `[${ERROR_CODES.DEVICE_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`),
    }),
});

export const downloadPhotoSchema = z.object({
    params: z.object({
        serialNumber: z.string({
            required_error: `[${ERROR_CODES.DEVICE_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`
        }).min(1, `[${ERROR_CODES.DEVICE_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.DEVICE_SERIAL_INVALID]}`),
        filename: z.string({
            required_error: `[${ERROR_CODES.DEVICE_ATTRIBUTE_INVALID}]Filename is required`,
            invalid_type_error: `[${ERROR_CODES.DEVICE_ATTRIBUTE_INVALID}]Invalid filename`
        }).min(1, `[${ERROR_CODES.DEVICE_ATTRIBUTE_INVALID}]Filename cannot be empty`),
    }),
    query: z.object({
        thumbnail: z.string().optional(),
    }),
});

export type CameraStreamInput = z.infer<typeof cameraStreamSchema>;
export type CapturePhotoInput = z.infer<typeof capturePhotoSchema>['body'];
export type CameraControlInput = z.infer<typeof cameraControlSchema>['body'];
export type CameraConfigInput = z.infer<typeof cameraConfigSchema>['body'];