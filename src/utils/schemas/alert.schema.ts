import { z } from 'zod';

export const alertTypeSchema = z.object({
    body: z.object({
        alert_type_name: z
            .string()
            .min(1, "Alert type name is required")
            .max(500, "Alert type name must be 500 characters or less"),
        priority: z
            .number()
            .int()
            .min(1, "Priority must be at least 1")
            .max(5, "Priority must not exceed 5")
            .optional()
            .default(1),
    }),
});

export const updateAlertTypeSchema = z.object({
    body: z.object({
        alert_type_name: z
            .string()
            .min(1, "Alert type name is required")
            .max(500, "Alert type name must be 500 characters or less")
            .optional(),
        priority: z
            .number()
            .int()
            .min(1, "Priority must be at least 1")
            .max(5, "Priority must not exceed 5")
            .optional(),
    }),
});

export const alertTypeIdSchema = z.object({
    params: z.object({
        alertTypeId: z
            .string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, "Alert Type ID must be a positive number"),
    }),
});

export const alertSchema = z.object({
    body: z.object({
        device_serial: z
            .string()
            .min(1, "Device serial is required")
            .max(50)
            .optional(),
        space_id: z.number().positive("Space ID must be a positive number").optional(),
        message: z.string().optional(),
        alert_type_id: z
            .number()
            .positive("Alert type ID must be a positive number"),
        status: z.enum(["unread", "read"]).optional().default("unread"),
    }),
});

export const updateAlertSchema = z.object({
    body: z.object({
        message: z.string().optional(),
        status: z.enum(["unread", "read"]).optional(),
    }),
});

export const alertIdSchema = z.object({
    params: z.object({
        alertId: z
            .string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, "Alert ID must be a positive number"),
    }),
});

export type AlertTypeInput = z.infer<typeof alertTypeSchema>["body"];
export type UpdateAlertTypeInput = z.infer<typeof updateAlertTypeSchema>["body"];
export type AlertTypeIdInput = z.infer<typeof alertTypeIdSchema>["params"];
export type AlertInput = z.infer<typeof alertSchema>["body"];
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>["body"];
export type AlertIdInput = z.infer<typeof alertIdSchema>["params"];
