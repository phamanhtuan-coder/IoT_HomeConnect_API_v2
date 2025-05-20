/**
 * Interface đại diện cho một ngôi nhà.
 * @property house_id - ID của ngôi nhà.
 * @property group_id - ID của nhóm, có thể là null.
 * @property house_name - Tên của ngôi nhà.
 * @property address - Địa chỉ, có thể là null.
 * @property icon_name - Tên icon đại diện, có thể là null.
 * @property icon_color - Màu sắc icon, có thể là null.
 * @property created_at - Thời gian tạo, có thể là null.
 * @property updated_at - Thời gian cập nhật, có thể là null.
 * @property is_deleted - Trạng thái đã xóa hay chưa, có thể là null.
 */
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