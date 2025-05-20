/**
 * Enum đại diện cho trạng thái của yêu cầu chuyển quyền sở hữu thiết bị.
 * - PENDING: Đang chờ xử lý
 * - APPROVED: Đã được phê duyệt
 * - REJECTED: Đã bị từ chối
 */
export enum OwnershipTransferStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

/**
 * Interface mô tả thông tin của một yêu cầu chuyển quyền sở hữu thiết bị.
 * @property request_id - ID của yêu cầu
 * @property device_serial - Số serial của thiết bị (có thể null)
 * @property from_user_id - ID người chuyển (có thể null)
 * @property to_user_id - ID người nhận (có thể null)
 * @property group_id - ID nhóm liên quan (có thể null)
 * @property status - Trạng thái của yêu cầu
 * @property requested_at - Thời điểm gửi yêu cầu (có thể null)
 * @property approved_at - Thời điểm phê duyệt (có thể null)
 * @property created_at - Thời điểm tạo bản ghi (có thể null)
 * @property updated_at - Thời điểm cập nhật bản ghi (có thể null)
 * @property is_deleted - Đánh dấu đã xóa (có thể null)
 */
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

/**
 * Interface mô tả lịch sử chuyển quyền sở hữu thiết bị.
 * @property history_id - ID của lịch sử chuyển quyền
 * @property ticket_id - ID của ticket liên quan
 * @property device_serial - Số serial của thiết bị (có thể null)
 * @property from_user_id - ID người chuyển (có thể null)
 * @property to_user_id - ID người nhận (có thể null)
 * @property transferred_at - Thời điểm chuyển quyền (có thể null)
 * @property legal_expired_date - Ngày hết hạn pháp lý (có thể null)
 * @property is_expired - Đã hết hạn hay chưa (có thể null)
 * @property created_at - Thời điểm tạo bản ghi (có thể null)
 * @property updated_at - Thời điểm cập nhật bản ghi (có thể null)
 * @property is_deleted - Đánh dấu đã xóa (có thể null)
 */
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