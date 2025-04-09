import { JwtPayload } from 'jsonwebtoken';

export interface RefreshTokenPayload extends JwtPayload {
    userId?: string; // Thay number bằng string để khớp account_id
    employeeId?: string; // Thay number bằng string để khớp account_id
    type: 'refresh';
}

export interface LoginRequestBody {
    email: string; // Giữ nguyên vì username trong schema được dùng như email
    password: string;
    rememberMe?: boolean;
}

export interface TokenResponse {
    accessToken: string;
    refreshToken?: string;
    deviceUuid?: string; // Đổi từ 'any' thành 'string', thêm '?' vì không phải lúc nào cũng có
}

export interface UserJwtPayload extends JwtPayload {
    userId: string; // Thay number bằng string
    email: string;
    role: string; // role_id trong schema là String, bỏ cứng 'user'
}

export interface EmployeeJwtPayload extends JwtPayload {
    employeeId: string; // Thay number bằng string
    email: string;
    role: string; // role_id trong schema là String, bỏ enum EmployeeRole
}

export type AuthJwtPayload = UserJwtPayload | EmployeeJwtPayload;

// Bỏ enum EmployeeRole vì role giờ được lấy từ role_id trong bảng role
// Nếu vẫn muốn dùng enum, cần đồng bộ với dữ liệu trong bảng role
// export type EmployeeRole = 'ADMIN' | 'PRODUCTION' | 'TECHNICIAN' | 'RND' | 'EMPLOYEE';

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
    role?: string;
    phone?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthJwtPayload;
        }
    }
}