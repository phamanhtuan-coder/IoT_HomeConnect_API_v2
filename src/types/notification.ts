/**
 * Enum NotificationType
 * Định nghĩa các loại thông báo có thể có trong hệ thống.
 * - SYSTEM: Thông báo hệ thống
 * - ORDER: Thông báo đơn hàng
 * - PROMOTION: Thông báo khuyến mãi
 * - SECURITY: Thông báo bảo mật
 * - SHARE_REQUEST: Thông báo yêu cầu chia sẻ
 * - TICKET: Thông báo phiếu hỗ trợ
 * - ALERT: Thông báo cảnh báo
 */
export enum NotificationType {
    SYSTEM = 'system',
    ORDER = 'order',
    PROMOTION = 'promotion',
    SECURITY = 'security',
    SHARE_REQUEST = 'share_request',
    TICKET = 'ticket',
    ALERT = 'alert',
}

/**
 * Định nghĩa interface cho một thông báo.
 * @property id Mã định danh thông báo.
 * @property account_id Mã tài khoản nhận thông báo, có thể null.
 * @property role_id Mã vai trò liên quan, có thể null.
 * @property text Nội dung thông báo, có thể null.
 * @property type Loại thông báo (NotificationType).
 * @property is_read Trạng thái đã đọc hay chưa, có thể null.
 * @property created_at Thời gian tạo thông báo, có thể null.
 * @property updated_at Thời gian cập nhật thông báo, có thể null.
 * @property deleted_at Thời gian xóa thông báo, có thể null.
 */
export interface Notification {
    id: number;
    account_id: string | null;
    role_id: number | null;
    text: string | null;
    type: NotificationType;
    is_read: boolean | null;
    created_at: Date | null;
    updated_at: Date | null;
    deleted_at: Date | null;
}