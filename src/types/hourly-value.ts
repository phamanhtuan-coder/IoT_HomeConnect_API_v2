/**
 * Giao diện HourlyValue đại diện cho giá trị trung bình theo giờ của một thiết bị hoặc không gian.
 *
 * @property {number} hourly_value_id - ID duy nhất của bản ghi giá trị theo giờ.
 * @property {string | null} device_serial - Số serial của thiết bị, có thể null nếu không xác định.
 * @property {number | null} space_id - ID của không gian, có thể null nếu không xác định.
 * @property {Date | null} hour_timestamp - Dấu thời gian của giờ, có thể null.
 * @property {Record<string, number | null> | null} avg_value - Giá trị trung bình của các chỉ số, dạng key-value, có thể null.
 * @property {number | null} sample_count - Số lượng mẫu được lấy trong giờ đó, có thể null.
 * @property {Date | null} created_at - Thời gian tạo bản ghi, có thể null.
 * @property {Date | null} updated_at - Thời gian cập nhật bản ghi, có thể null.
 * @property {boolean | null} is_deleted - Trạng thái xóa mềm của bản ghi, có thể null.
 */
export interface HourlyValue {
    hourly_value_id: number;
    device_serial: string | null;
    space_id: number | null;
    hour_timestamp: Date | null;
    avg_value: Record<string, number | null> | null;
    sample_count: number | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}