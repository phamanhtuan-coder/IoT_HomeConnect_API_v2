import { JwtPayload } from 'jsonwebtoken';

export interface RefreshTokenPayload extends JwtPayload {
    userId?: string; // Thay number bằng string để khớp account_id
    employeeId?: string; // Thay number bằng string để khớp account_id
    type: 'refresh';
}

export interface LoginRequestBody {
    username: string;
    password: string;
    rememberMe?: boolean;
}

export interface TokenResponse {
    accessToken: string;
    refreshToken?: string;
    deviceUuid?: string; // Đổi từ 'any' thành 'string', thêm '?' vì không phải lúc nào cũng có
}

export interface UserJwtPayload extends JwtPayload {
    userId: string;
    username: string;
    role: string;
}

export interface EmployeeJwtPayload extends JwtPayload {
    employeeId: string;
    username: string; // Thay email thành username
    role: string;
}
export type AuthJwtPayload = UserJwtPayload | EmployeeJwtPayload;

// Bỏ enum EmployeeRole vì role giờ được lấy từ role_id trong bảng role
// Nếu vẫn muốn dùng enum, cần đồng bộ với dữ liệu trong bảng role
// export type EmployeeRole = 'ADMIN' | 'PRODUCTION' | 'TECHNICIAN' | 'RND' | 'EMPLOYEE';

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

// Group role enum
export enum GroupRole {
    OWNER = 'owner',
    VICE = 'vice',
    ADMIN = 'admin',
    MEMBER = 'member',
}

// Group interface
export interface Group {
    group_id: number;
    group_name: string;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

// UserGroup interface
export interface UserGroup {
    user_group_id: number;
    account_id: string | null;
    group_id: number | null;
    role: GroupRole | null;
    joined_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

// House interface
export interface House {
    house_id: number;
    group_id: number | null;
    house_name: string ;
    address: string | null;
    icon_name: string | null;
    icon_color: string | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

// Space interface
export interface Space {
    space_id: number;
    house_id: number | null;
    space_name: string;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

export enum PermissionType {
    CONTROL = 'CONTROL',
    VIEW = 'VIEW',
}

export enum ShareRequestStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}
export interface DeviceAttributes {
    brightness?: number;
    color?: string;
    [key: string]: any;
}

export interface Device {
    device_id: number;
    serial_number: string;
    template_id: number | null;
    space_id: number | null;
    account_id: string | null;
    hub_id: string | null;
    firmware_id: number | null;
    name: string;
    power_status: boolean| null;
    attribute: Record<string, any> | null;
    wifi_ssid: string | null;
    wifi_password: string | null;
    current_value: Record<string, any> | null;
    link_status: string| null;
    last_reset_at: Date | null;
    lock_status: string| null;
    locked_at: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

export interface DeviceTemplate {
    template_id: number;
    device_type_id: number | null;
    name: string;
    created_by: string | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

export interface SharedPermission {
    permission_id: number;
    device_id: number | null;
    shared_with_user_id: string | null;
    permission_type: PermissionType;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

export interface ShareRequest {
    request_id: number;
    device_serial: string | null;
    from_user_id: string | null;
    to_user_id: string | null;
    permission_type: PermissionType;
    status: ShareRequestStatus;
    requested_at: Date | null;
    approved_at: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

export interface AlertType {
    alert_type_id: number;
    alert_type_name: string;
    priority: number | null;
    is_deleted: boolean | null;
    created_at: Date | null;
    updated_at: Date | null;
}

export interface Alert {
    alert_id: number;
    device_serial: string | null;
    space_id: number | null;
    message: string | null;
    timestamp: Date | null;
    status: string | null;
    alert_type_id: number;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

export interface TicketType {
    ticket_type_id: number;
    type_name: string;
    priority: number | null;
    is_active: boolean | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

export interface Ticket {
    ticket_id: number;
    user_id: string | null;
    device_serial: string | null;
    ticket_type_id: number;
    description: string | null;
    evidence: any | null;
    status: string | null;
    created_at: Date | null;
    updated_at: Date | null;
    assigned_to: string | null;
    resolved_at: Date | null;
    resolve_solution: string | null;
    is_deleted: boolean | null;
}

export enum OwnershipTransferStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export interface OwnershipTransferRequest {
    request_id: number;
    device_serial: string | null;
    from_user_id: string | null;
    to_user_id: string | null;
    group_id: number | null;
    status: OwnershipTransferStatus;
    requested_at: Date | null;
    approved_at: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

export interface OwnershipHistory {
    history_id: number;
    ticket_id: number;
    device_serial: string | null;
    from_user_id: string | null;
    to_user_id: string | null;
    transferred_at: Date | null;
    legal_expired_date: Date | null;
    is_expired: boolean | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthJwtPayload;
            groupRole?: GroupRole;
        }
    }
}