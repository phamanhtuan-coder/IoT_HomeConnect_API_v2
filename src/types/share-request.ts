/**
 * Enum đại diện cho các loại quyền chia sẻ.
 * - CONTROL: Quyền kiểm soát.
 * - VIEW: Quyền xem.
 */
export enum PermissionType {
    CONTROL = 'CONTROL',
    VIEW = 'VIEW',
}

/**
 * Enum đại diện cho trạng thái của yêu cầu chia sẻ.
 * - PENDING: Đang chờ xử lý.
 * - APPROVED: Đã được chấp thuận.
 * - REJECTED: Đã bị từ chối.
 */
export enum ShareRequestStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

/**
 * Interface đại diện cho một yêu cầu chia sẻ thiết bị.
 * @property request_id - ID của yêu cầu chia sẻ.
 * @property device_serial - Số serial của thiết bị được chia sẻ.
 * @property from_user_id - ID người gửi yêu cầu chia sẻ.
 * @property to_user_id - ID người nhận yêu cầu chia sẻ.
 * @property permission_type - Loại quyền chia sẻ (CONTROL hoặc VIEW).
 * @property status - Trạng thái của yêu cầu chia sẻ (pending, approved, rejected).
 * @property requested_at - Thời điểm gửi yêu cầu chia sẻ.
 * @property approved_at - Thời điểm yêu cầu được chấp thuận.
 * @property created_at - Thời điểm tạo yêu cầu.
 * @property updated_at - Thời điểm cập nhật yêu cầu gần nhất.
 * @property is_deleted - Đánh dấu yêu cầu đã bị xóa hay chưa.
 */
export interface ShareRequest {
    request_id: number;
    device_serial: string | null;
    from_user_id: string | null;
    to_user_id: string | null;
    permission_type: PermissionType;
    status: ShareRequestStatus;
    requested_at: Date | null;
    approved_at: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}