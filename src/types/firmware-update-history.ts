/**
 * Giao diện đại diện cho lịch sử cập nhật firmware của thiết bị.
 * @property update_id - ID của lần cập nhật.
 * @property device_serial - Số serial của thiết bị (có thể null).
 * @property firmware_id - ID của firmware đã cập nhật (có thể null).
 * @property updated_at - Thời gian cập nhật (có thể null).
 * @property status - Trạng thái cập nhật (có thể null).
 * @property created_at - Thời gian tạo bản ghi (có thể null).
 * @property is_deleted - Đánh dấu đã xóa hay chưa (có thể null).
 */
export interface FirmwareUpdateHistory {
    update_id: number;
    device_serial: string | null;
    firmware_id: string| null;
    updated_at: Date | null;
    status: string | null;
    created_at: Date | null;
    is_deleted: boolean | null;
}