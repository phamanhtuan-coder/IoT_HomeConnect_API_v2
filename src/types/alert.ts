/**
 * Định nghĩa interface Alert cho cảnh báo trong hệ thống.
 * @property alert_id - Mã định danh cảnh báo.
 * @property device_serial - Số serial thiết bị liên quan (có thể null).
 * @property space_id - Mã không gian liên quan (có thể null).
 * @property message - Nội dung cảnh báo (có thể null).
 * @property timestamp - Thời gian xảy ra cảnh báo (có thể null).
 * @property status - Trạng thái cảnh báo (có thể null).
 * @property alert_type_id - Mã loại cảnh báo.
 * @property created_at - Thời gian tạo cảnh báo (có thể null).
 * @property updated_at - Thời gian cập nhật cảnh báo (có thể null).
 * @property is_deleted - Đánh dấu đã xoá hay chưa (có thể null).
 */
export interface Alert {
    alert_id: number;
    device_serial: string | null;
    space_id: number | null;
    message: string | null;
    timestamp: Date | null;
    status: string | null;
    alert_type_id: number;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}