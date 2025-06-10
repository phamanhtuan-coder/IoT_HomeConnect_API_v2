import {PermissionType} from "./share-request";

/**
 * Đại diện cho quyền được chia sẻ trên một thiết bị.
 * @property permission_id - ID của quyền chia sẻ.
 * @property device_id - ID của thiết bị (có thể null nếu không áp dụng cho thiết bị cụ thể).
 * @property shared_with_user_id - ID của người dùng được chia sẻ (có thể null).
 * @property permission_type - Loại quyền được chia sẻ.
 * @property created_at - Thời gian tạo quyền chia sẻ (có thể null).
 * @property updated_at - Thời gian cập nhật quyền chia sẻ (có thể null).
 * @property is_deleted - Trạng thái đã xóa hay chưa (có thể null).
 */
export interface SharedPermission {
    permission_id: number;
    device_id: string | null;
    shared_with_user_id: string | null;
    permission_type: PermissionType;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}