/**
 * Enum GroupRole đại diện cho các vai trò của thành viên trong nhóm.
 * @enum {string}
 * @property {string} OWNER - Chủ sở hữu nhóm.
 * @property {string} VICE - Phó nhóm.
 * @property {string} ADMIN - Quản trị viên nhóm.
 * @property {string} MEMBER - Thành viên nhóm.
 */
export enum GroupRole {
    OWNER = 'owner',
    VICE = 'vice',
    ADMIN = 'admin',
    MEMBER = 'member'
}

/**
 * Roles that can manage other users (add/remove/update roles)
 */
export const MANAGEMENT_ROLES = [GroupRole.OWNER, GroupRole.VICE];

/**
 * Roles that can edit group information
 */
export const GROUP_EDIT_ROLES = [GroupRole.OWNER];

/**
 * Giao diện Group đại diện cho thông tin của một nhóm.
 * @property {number} group_id - ID của nhóm.
 * @property {string} group_name - Tên của nhóm.
 * @property {string | null} icon_name - Tên biểu tượng của nhóm.
 * @property {string | null} icon_color - Màu sắc biểu tượng của nhóm.
 * @property {string | null} group_description - Mô tả về nhóm.
 * @property {Date | null} created_at - Thời điểm tạo nhóm.
 * @property {Date | null} updated_at - Thời điểm cập nhật gần nhất.
 * @property {boolean | null} is_deleted - Trạng thái xóa mềm của nhóm.
 */
export interface Group {
    group_id: number;
    group_name: string;
    group_description?: string | null;
    icon_name?: string | null;
    icon_color?: string | null;
    created_at?: Date | null;
    updated_at?: Date | null;
    is_deleted?: boolean | null;
    role?: GroupRole;  // Thêm role để trả về vai trò của user trong group
}

/**
 * Giao diện UserGroup đại diện cho mối quan hệ giữa người dùng và nhóm.
 * @property {number} user_group_id - ID của mối quan hệ user-group.
 * @property {string | null} account_id - ID tài khoản người dùng, có thể null.
 * @property {number | null} group_id - ID nhóm, có thể null.
 * @property {GroupRole | null} role - Vai trò của người dùng trong nhóm, có thể null.
 * @property {Date | null} joined_at - Thời điểm người dùng tham gia nhóm, có thể null.
 * @property {Date | null} updated_at - Thời điểm cập nhật gần nhất, có thể null.
 * @property {boolean | null} is_deleted - Trạng thái xóa mềm, có thể null.
 */
export interface UserGroup {
    user_group_id: number;
    account_id: string | null;
    group_id: number | null;
    role: GroupRole | null;
    joined_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

/**
 * Giao diện GroupMember đại diện cho thông tin thành viên trong nhóm.
 * @property {number} user_group_id - ID của mối quan hệ user-group.
 * @property {string} account_id - ID tài khoản người dùng.
 * @property {number} group_id - ID nhóm.
 * @property {GroupRole} role - Vai trò của người dùng trong nhóm.
 * @property {Date | null} joined_at - Thời điểm người dùng tham gia nhóm.
 * @property {string | null} username - Tên đăng nhập của người dùng.
 * @property {string | null} email - Email của người dùng.
 * @property {string | null} full_name - Tên đầy đủ của người dùng.
 * @property {string | null} avatar - Đường dẫn ảnh đại diện của người dùng.
 */
export interface GroupMember {
    user_group_id: number;
    account_id: string;
    group_id: number;
    role: GroupRole;
    joined_at: Date | null;
    username: string | null;
    email: string | null;
    full_name: string | null;
    avatar: string | null;
}

/**
 * Giao diện GroupWithRole mở rộng từ Group, bao gồm cả vai trò của người dùng trong nhóm.
 * @property {GroupRole} role - Vai trò của người dùng trong nhóm.
 */
export interface GroupWithRole extends Omit<Group, 'role'> {
    role: GroupRole;  // Make role required in this interface
}
