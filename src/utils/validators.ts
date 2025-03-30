// src/utils/validators.ts
import { z } from 'zod';
import {EmployeeRole} from "../types/auth";

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
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
        email: z.string().email('Invalid email format'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        name: z.string().min(1, 'Name is required'),
        phone: z.string().max(20, 'Phone must be 20 characters or less').optional(),
        address: z.string().optional(),
        dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format').optional(),
    }),
});

export const employeeRegisterSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email format'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        role: z.nativeEnum(EmployeeRole).optional(),
        phone: z.string().max(20, 'Phone must be 20 characters or less').optional(),
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
        role: z.nativeEnum(EmployeeRole).optional(),
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
        id: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'ID must be a positive number'),
    }),
});

export const employeeIdSchema = z.object({
    params: z.object({
        id: z.string().transform((val) => parseInt(val)).refine((val) => val > 0, 'ID must be a positive number'),
    }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type UserRegisterInput = z.infer<typeof userRegisterSchema>['body'];
export type EmployeeRegisterInput = z.infer<typeof employeeRegisterSchema>['body'];
export type UserIdInput = z.infer<typeof userIdSchema>['params'];
export type EmployeeIdInput = z.infer<typeof employeeIdSchema>['params'];