/**
 * Đại diện cho một không gian trong một ngôi nhà.
 * @property {number} space_id - Mã định danh duy nhất của không gian.
 * @property {number | null} house_id - Mã định danh của ngôi nhà liên kết, hoặc null nếu chưa gán.
 * @property {string} space_name - Tên của không gian.
 * @property {string | null} icon_color - Màu sắc của icon, hoặc null nếu không xác định.
 * @property {string | null} icon_name - Tên icon, hoặc null nếu không xác định.
 * @property {string | null} space_description - Mô tả không gian, hoặc null nếu không xác định.
 * @property {Date | null} created_at - Thời điểm tạo không gian, hoặc null nếu không xác định.
 * @property {Date | null} updated_at - Thời điểm cập nhật gần nhất, hoặc null nếu không xác định.
 * @property {boolean | null} is_deleted - Trạng thái đã xóa hay chưa, hoặc null nếu không xác định.
 */
export interface Space {
    space_id: number;
    house_id: number | null;
    space_name: string;
    icon_color?: string | null;
    icon_name?: string | null;
    space_description?: string | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}