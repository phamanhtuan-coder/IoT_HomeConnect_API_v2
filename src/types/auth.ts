/**
 * Các kiểu dữ liệu và interface liên quan đến xác thực (authentication).
 * Được sử dụng cho việc xử lý JWT, đăng nhập, đăng ký, và mở rộng request của Express.
 */

import {JwtPayload} from 'jsonwebtoken';
import {GroupRole} from "./group";

/**
 * Payload cho refresh token JWT.
 * @property userId - ID người dùng (kiểu string, có thể không có).
 * @property employeeId - ID nhân viên (kiểu string, có thể không có).
 * @property type - Loại token, luôn là 'refresh'.
 */
export interface RefreshTokenPayload extends JwtPayload {
    userId?: string; // Thay number bằng string để khớp account_id
    employeeId?: string; // Thay number bằng string để khớp account_id
    type: 'refresh';
}

/**
 * Dữ liệu body gửi lên khi đăng nhập.
 * @property username - Tên đăng nhập.
 * @property password - Mật khẩu.
 * @property rememberMe - Ghi nhớ đăng nhập (tùy chọn).
 */
export interface LoginRequestBody {
    username: string;
    password: string;
    rememberMe?: boolean;
    deviceName?: string;
    deviceId?: string;
    deviceUuid?: string;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Dữ liệu trả về sau khi đăng nhập thành công.
 * @property accessToken - JWT access token.
 * @property refreshToken - JWT refresh token (tùy chọn).
 * @property deviceUuid - UUID của thiết bị (tùy chọn).
 */
export interface TokenResponse {
    accessToken: string;
    refreshToken?: string;
    deviceUuid?: string;
    userId?: string; // Thêm userId vào response
}

/**
 * Payload JWT cho người dùng.
 * @property userId - ID người dùng.
 * @property username - Tên đăng nhập.
 * @property role - Vai trò của người dùng.
 */
export interface UserJwtPayload extends JwtPayload {
    userId: string;
    username: string;
    role: string;
}

/**
 * Payload JWT cho nhân viên.
 * @property employeeId - ID nhân viên.
 * @property username - Tên đăng nhập.
 * @property role - Vai trò của nhân viên.
 */
export interface EmployeeJwtPayload extends JwtPayload {
    accountId: string;
    employeeId: string;
    username: string; // Thay email thành username
    role: string;
}

/**
 * Kiểu union cho payload JWT xác thực (người dùng hoặc nhân viên).
 */
export type AuthJwtPayload = UserJwtPayload | EmployeeJwtPayload;

// Bỏ enum EmployeeRole vì role giờ được lấy từ role_id trong bảng role
// Nếu vẫn muốn dùng enum, cần đồng bộ với dữ liệu trong bảng role
// export type EmployeeRole = 'ADMIN' | 'PRODUCTION' | 'TECHNICIAN' | 'RND' | 'EMPLOYEE';

/**
 * Dữ liệu body gửi lên khi đăng ký người dùng.
 * @property username - Tên đăng nhập (bắt buộc).
 * @property surname - Họ.
 * @property lastname - Tên (tùy chọn).
 * @property image - Ảnh đại diện (tùy chọn).
 * @property phone - Số điện thoại (tùy chọn).
 * @property email - Email.
 * @property birthdate - Ngày sinh (tùy chọn).
 * @property gender - Giới tính (tùy chọn, true/false).
 * @property password - Mật khẩu.
 */
export type UserRegisterRequestBody = {
    username: string; // Bắt buộc
    surname: string;
    lastname?: string;
    image?: string;
    phone?: string;
    email: string;
    birthdate?: string;
    gender?: boolean;
    password: string;
};

/**
 * Dữ liệu body gửi lên khi đăng ký nhân viên.
 * @property username - Tên đăng nhập (bắt buộc).
 * @property surname - Họ.
 * @property lastname - Tên (tùy chọn).
 * @property image - Ảnh đại diện (tùy chọn).
 * @property email - Email.
 * @property password - Mật khẩu.
 * @property birthdate - Ngày sinh (tùy chọn).
 * @property gender - Giới tính (tùy chọn, true/false).
 * @property phone - Số điện thoại (tùy chọn).
 * @property status - Trạng thái (tùy chọn).
 * @property role - Vai trò của nhân viên.
 */
export type EmployeeRegisterRequestBody = {
    username: string; // Bắt buộc
    surname: string;
    lastname?: string;
    image?: string;
    email: string;
    password: string;
    birthdate?: string;
    gender?: boolean;
    phone?: string;
    status?: number;
    role: string;
};

/**
 * Mở rộng interface Request của Express để thêm thông tin xác thực.
 * @property user - Payload JWT xác thực (người dùng hoặc nhân viên).
 * @property groupRole - Vai trò nhóm (GroupRole).
 */
declare global {
    namespace Express {
        interface Request {
            user?: AuthJwtPayload;
            groupRole?: GroupRole;
        }
    }
}