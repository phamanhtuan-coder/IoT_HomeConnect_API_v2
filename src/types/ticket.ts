/**
 * Giao diện mô tả thông tin của Ticket.
 *
 * @property {number} ticket_id ID của ticket.
 * @property {string | null} user_id ID người dùng liên quan đến ticket.
 * @property {string | null} device_serial Số serial của thiết bị.
 * @property {number} ticket_type_id ID của loại ticket.
 * @property {string | null} description Mô tả của ticket.
 * @property {any | null} evidence Chứng cứ liên quan đến ticket.
 * @property {string | null} status Trạng thái của ticket.
 * @property {Date | null} created_at Ngày tạo ticket.
 * @property {Date | null} updated_at Ngày cập nhật ticket.
 * @property {string | null} assigned_to Người được phân công xử lý ticket.
 * @property {Date | null} resolved_at Thời gian giải quyết ticket.
 * @property {string | null} resolve_solution Giải pháp để giải quyết ticket.
 * @property {boolean | null} is_deleted Trạng thái xoá của ticket.
 */
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