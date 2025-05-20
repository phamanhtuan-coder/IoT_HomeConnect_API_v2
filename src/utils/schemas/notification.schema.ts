import { z } from 'zod';
import { NotificationType } from "../../types/notification";

export const notificationSchema = z.object({
    body: z.object({
        account_id: z.string().max(32, 'Account ID must be 32 characters or less').optional(),
        role_id: z.number().positive('Role ID must be a positive number').optional(),
        text: z.string().min(1, 'Notification text is required').max(255, 'Text must be 255 characters or less'),
        type: z.enum([
            NotificationType.SYSTEM,
            NotificationType.ORDER,
            NotificationType.PROMOTION,
            NotificationType.SECURITY,
            NotificationType.SHARE_REQUEST,
            NotificationType.TICKET,
            NotificationType.ALERT,
        ]),
        is_read: z.boolean().optional().default(false),
    }),
});

export const updateNotificationSchema = z.object({
    body: z.object({
        is_read: z.boolean().optional(),
    }),
});

export const notificationIdSchema = z.object({
    params: z.object({
        id: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'Notification ID must be a positive number'),
    }),
});

export const notificationFilterSchema = z.object({
    query: z.object({
        account_id: z.string().max(32, 'Account ID must be 32 characters or less').optional(),
        role_id: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'Role ID must be a positive number').optional(),
        type: z.enum([
            NotificationType.SYSTEM,
            NotificationType.ORDER,
            NotificationType.PROMOTION,
            NotificationType.SECURITY,
            NotificationType.SHARE_REQUEST,
            NotificationType.TICKET,
            NotificationType.ALERT,
        ]).optional(),
        is_read: z.string().transform((val) => val === 'true').optional(),
        page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
        limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
    }),
});

export type NotificationInput = z.infer<typeof notificationSchema>['body'];
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>['body'];
export type NotificationIdInput = z.infer<typeof notificationIdSchema>['params'];
export type NotificationFilterInput = z.infer<typeof notificationFilterSchema>['query'];
