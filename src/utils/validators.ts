import { z } from 'zod';
import {GroupRole, PermissionType} from '../types/auth';

export const loginSchema = z.object({
    body: z.object({
        username: z.string().min(1, 'Username is required'), // Thay email thành username, bỏ kiểm tra email format
        password: z.string().min(6, 'Password must be at least 6 characters'),
        rememberMe: z.boolean().optional().default(false),
    }),
});

export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string().min(1, 'Refresh token is required'),
    }),
});

export const userRegisterSchema = z.object({
    body: z.object({
        username: z.string().min(1, 'Username is required'),
        email: z.string().email('Invalid email format').optional(),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        surname: z.string().min(1, 'Surname is required'),
        lastname: z.string().optional(),
        phone: z.string().max(20, 'Phone must be 20 characters or less').optional(),
        birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format').optional(),
        gender: z.boolean().optional(),
    }),
});

export const employeeRegisterSchema = z.object({
    body: z.object({
        username: z.string().min(1, 'Username is required'),
        email: z.string().email('Invalid email format').optional(),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        surname: z.string().min(1, 'Surname is required'),
        lastname: z.string().optional(),
        phone: z.string().max(20, 'Phone must be 20 characters or less').optional(),
        birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format').optional(),
        gender: z.boolean().optional(),
        status: z.number().optional(),
        role: z.string().min(1, 'Role is required'),
    }),
});
export const paginationSchema = z.object({
    query: z.object({
        page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
        limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
    }),
});

export const employeeFilterSchema = z.object({
    query: z.object({
        role: z.enum(['ADMIN', 'PRODUCTION', 'TECHNICIAN', 'RND', 'EMPLOYEE']).optional(), // Đồng bộ với EmployeeRole
        name: z.string().optional(),
        page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
        limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
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

export const userIdSchema = z.object({
    params: z.object({
        id: z.string(), // Thay vì parseInt vì account_id là string
    }),
});

export const employeeIdSchema = z.object({
    params: z.object({
        id: z.string(), // Thay vì parseInt vì account_id là string
    }),
});

export const groupSchema = z.object({
    body: z.object({
        group_name: z.string().min(1, 'Group name is required').max(255, 'Group name must be 255 characters or less'),
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

export const houseSchema = z.object({
    body: z.object({
        groupId: z.number().positive('Group ID must be a positive number'),
        house_name: z.string().min(1, 'House name is required').max(255, 'House name must be 255 characters or less'),
        address: z.string().max(255, 'Address must be 255 characters or less').optional(),
        icon_name: z.string().max(100, 'Icon name must be 100 characters or less').optional(),
        icon_color: z.string().max(50, 'Icon color must be 50 characters or less').optional(),
    }),
});

export const houseIdSchema = z.object({
    params: z.object({
        houseId: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'House ID must be a positive number'),
    }),
});

export const spaceSchema = z.object({
    body: z.object({
        houseId: z.number().positive('House ID must be a positive number'),
        space_name: z.string().min(1, 'Space name is required').max(255, 'Space name must be 255 characters or less'),
    }),
});

export const spaceIdSchema = z.object({
    params: z.object({
        spaceId: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'Space ID must be a positive number'),
    }),
});

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

// Thêm vào cuối file /src/utils/validators.ts

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

// Add to the end of /src/utils/validators.ts

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

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type UserRegisterInput = z.infer<typeof userRegisterSchema>['body'];
export type EmployeeRegisterInput = z.infer<typeof employeeRegisterSchema>['body'];
export type UserIdInput = z.infer<typeof userIdSchema>['params'];
export type EmployeeIdInput = z.infer<typeof employeeIdSchema>['params'];

export type GroupInput = z.infer<typeof groupSchema>['body'];
export type GroupIdInput = z.infer<typeof groupIdSchema>['params'];
export type UserGroupInput = z.infer<typeof userGroupSchema>['body'];
export type UpdateGroupRoleInput = z.infer<typeof updateGroupRoleSchema>['body'];


export type HouseInput = z.infer<typeof houseSchema>['body'];
export type HouseIdInput = z.infer<typeof houseIdSchema>['params'];
export type SpaceInput = z.infer<typeof spaceSchema>['body'];
export type SpaceIdInput = z.infer<typeof spaceIdSchema>['params'];

export type DeviceInput = z.infer<typeof deviceSchema>['body'];
export type DeviceIdInput = z.infer<typeof deviceIdSchema>['params'];
export type LinkDeviceInput = z.infer<typeof linkDeviceSchema>['body'];
export type ToggleDeviceInput = z.infer<typeof toggleDeviceSchema>['body'];
export type UpdateAttributesInput = z.infer<typeof updateAttributesSchema>['body'];
export type UpdateWifiInput = z.infer<typeof updateWifiSchema>['body'];
export type ShareRequestInput = z.infer<typeof shareRequestSchema>['body'];
export type ApproveShareRequestInput = z.infer<typeof approveShareRequestSchema>['body'];

export type AlertTypeInput = z.infer<typeof alertTypeSchema>["body"];
export type UpdateAlertTypeInput = z.infer<typeof updateAlertTypeSchema>["body"];
export type AlertTypeIdInput = z.infer<typeof alertTypeIdSchema>["params"];

export type AlertInput = z.infer<typeof alertSchema>["body"];
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>["body"];
export type AlertIdInput = z.infer<typeof alertIdSchema>["params"];
