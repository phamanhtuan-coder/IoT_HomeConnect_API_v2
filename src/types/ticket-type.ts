/**
 * Định nghĩa kiểu dữ liệu cho loại vé (TicketType).
 * @property ticket_type_id - ID duy nhất của loại vé.
 * @property type_name - Tên loại vé.
 * @property priority - Độ ưu tiên của loại vé (có thể null).
 * @property is_active - Trạng thái hoạt động của loại vé (có thể null).
 * @property created_at - Thời gian tạo loại vé (có thể null).
 * @property updated_at - Thời gian cập nhật loại vé (có thể null).
 * @property is_deleted - Trạng thái đã xoá của loại vé (có thể null).
 */
export interface TicketType {
    ticket_type_id: number;
    type_name: string;
    priority: number | null;
    is_active: boolean | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}