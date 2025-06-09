import { z } from 'zod';

export const loginSchema = z.object({
    body: z.object({
        username: z.string().min(1, 'Username is required'),
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

export const userIdSchema = z.object({
    params: z.object({
        id: z.string(), // account_id là string
    }),
});

export const employeeIdSchema = z.object({
    params: z.object({
        id: z.string(), // account_id là string
    }),
});

export const employeeFilterSchema = z.object({
    query: z.object({
        role: z.enum(['ADMIN', 'PRODUCTION', 'TECHNICIAN', 'RND', 'EMPLOYEE']).optional(),
        name: z.string().optional(),
        page: z.string().optional().transform((val) => (val ? parseInt(val) : 1)),
        limit: z.string().optional().transform((val) => (val ? parseInt(val) : 10)),
    }),
});

export const sendOtpSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
    }),
});

export const verifyOtpSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
        otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must contain only digits'),
    }),
});

export const checkEmailVerificationSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
    }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type UserRegisterInput = z.infer<typeof userRegisterSchema>['body'];
export type EmployeeRegisterInput = z.infer<typeof employeeRegisterSchema>['body'];
export type UserIdInput = z.infer<typeof userIdSchema>['params'];
export type EmployeeIdInput = z.infer<typeof employeeIdSchema>['params'];
