import { z } from 'zod';
import { PermissionType } from "../../types/share-request";

export const shareRequestSchema = z.object({
    body: z.object({
        device_serial: z.string().min(1, 'Serial number is required').max(50),
        to_user_email: z.string().email('Invalid email address'),
        permission_type: z.enum([PermissionType.CONTROL, PermissionType.VIEW]),
    }),
});

export const approveShareRequestSchema = z.object({
    body: z.object({
        accept: z.boolean(),
    }),
});

export const permissionIdSchema = z.object({
    params: z.object({
        permissionId: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'Permission ID must be positive'),
    }),
});

export const updatePermissionSchema = z.object({
    body: z.object({
        permissionType: z.string().min(1, 'Permission type is required'),
    }),
});

export const ownershipTransferSchema = z.object({
    body: z.object({
        device_serial: z.string().min(1, 'Serial number is required').max(50),
        to_user_email: z.string().email('Invalid email address'),
    }),
});

export const approveOwnershipTransferSchema = z.object({
    body: z.object({
        accept: z.boolean(),
    }),
});

export const ownershipHistoryIdSchema = z.object({
    params: z.object({
        historyId: z
            .string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'History ID must be a positive number'),
    }),
});

export type ShareRequestInput = z.infer<typeof shareRequestSchema>['body'];
export type ApproveShareRequestInput = z.infer<typeof approveShareRequestSchema>['body'];
export type OwnershipTransferInput = z.infer<typeof ownershipTransferSchema>['body'];
export type ApproveOwnershipTransferInput = z.infer<typeof approveOwnershipTransferSchema>['body'];
export type OwnershipHistoryIdInput = z.infer<typeof ownershipHistoryIdSchema>['params'];
