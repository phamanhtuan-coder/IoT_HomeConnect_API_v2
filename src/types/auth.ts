import { JwtPayload } from 'jsonwebtoken';

export interface RefreshTokenPayload extends JwtPayload {
    userId?: number; // For users
    employeeId?: number; // For employees
    type: 'refresh';
}

export interface LoginRequestBody {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface TokenResponse {
    accessToken: string;
    refreshToken?: string;
}

export interface UserJwtPayload extends JwtPayload {
    userId: number;
    email: string;
    role: 'user';
}

export interface EmployeeJwtPayload extends JwtPayload {
    employeeId: number;
    email: string;
    role: EmployeeRole;
}

export type AuthJwtPayload = UserJwtPayload | EmployeeJwtPayload;

export enum EmployeeRole {
    ADMIN = 'admin',
    PRODUCTION = 'production',
    TECHNICIAN = 'technician',
    RND = 'rnd',
    EMPLOYEE = 'employee',
}

export interface UserRegisterRequestBody {
    email: string;
    password: string;
    name: string;
    phone?: string;
    address?: string;
    dateOfBirth?: string; // ISO date string (e.g., "1990-01-01")
}

export interface EmployeeRegisterRequestBody {
    name: string;
    email: string;
    password: string;
    role?: EmployeeRole;
    phone?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthJwtPayload;
        }
    }
}