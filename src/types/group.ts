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
    MEMBER = 'member',
}

/**
 * Giao diện Group đại diện cho thông tin của một nhóm.
 * @property {number} group_id - ID của nhóm.
 * @property {string} group_name - Tên của nhóm.
 * @property {Date | null} created_at - Thời điểm tạo nhóm, có thể null.
 * @property {Date | null} updated_at - Thời điểm cập nhật gần nhất, có thể null.
 * @property {boolean | null} is_deleted - Trạng thái xóa mềm của nhóm, có thể null.
 */
export interface Group {
    group_id: number;
    group_name: string;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
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