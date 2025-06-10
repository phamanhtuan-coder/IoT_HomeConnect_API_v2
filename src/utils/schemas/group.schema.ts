import { z } from 'zod';
import { GroupRole } from "../../types/group";

export const paginationSchema = z.object({
    query: z.object({
        page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
        limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
    }),
});

export const groupSchema = z.object({
    body: z.object({
        group_name: z.string().min(1, 'Group name is required').max(255, 'Group name must be 255 characters or less'),
        icon_name: z.string().max(100, 'Icon name must be 100 characters or less').nullable().optional(),
        icon_color: z.string().max(100, 'Icon color must be 100 characters or less').nullable().optional(),
        group_description: z.string().nullable().optional(),
    }),
});

export const groupIdSchema = z.object({
    params: z.object({
        groupId: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'Group ID must be a positive number'),
    }),
});

export const userGroupSchema = z.object({
    body: z.object({
        groupId: z.number().positive('Group ID must be a positive number'),
        accountId: z.string().min(1, 'Account ID is required'),
        role: z.enum([GroupRole.OWNER, GroupRole.VICE, GroupRole.ADMIN, GroupRole.MEMBER]).optional().default(GroupRole.MEMBER),
    }),
});

export const updateGroupRoleSchema = z.object({
    body: z.object({
        accountId: z.string().min(1, 'Account ID is required'),
        role: z.enum([GroupRole.VICE, GroupRole.ADMIN, GroupRole.MEMBER]), // Owner cannot be assigned via update
    }),
    params: z.object({
        groupId: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'Group ID must be a positive number'),
    }),
});

export const myGroupsSchema = z.object({
    query: z.object({}).optional(),
    params: z.object({}),
    body: z.object({}).optional()
});

export type GroupInput = z.infer<typeof groupSchema>['body'];
export type GroupIdInput = z.infer<typeof groupIdSchema>['params'];
export type UserGroupInput = z.infer<typeof userGroupSchema>['body'];
export type UpdateGroupRoleInput = z.infer<typeof updateGroupRoleSchema>['body'];
