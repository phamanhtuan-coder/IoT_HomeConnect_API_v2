/**
 * Định nghĩa kiểu dữ liệu cho loại cảnh báo (AlertType).
 * @property alert_type_id - ID duy nhất của loại cảnh báo.
 * @property alert_type_name - Tên của loại cảnh báo.
 * @property priority - Độ ưu tiên của loại cảnh báo (có thể null).
 * @property is_deleted - Trạng thái đã xoá hay chưa (có thể null).
 * @property created_at - Thời gian tạo (có thể null).
 * @property updated_at - Thời gian cập nhật (có thể null).
 */
export interface AlertType {
    alert_type_id: number;
    alert_type_name: string;
    priority: number | null;
    is_deleted: boolean | null;
    created_at: Date | null;
    updated_at: Date | null;
}