/**
 * Thuộc tính của thiết bị.
 * @property {number} [brightness] - Độ sáng của thiết bị (tùy chọn).
 * @property {string} [color] - Màu sắc của thiết bị (tùy chọn).
 * @property {any} [key: string] - Các thuộc tính mở rộng khác.
 */
export interface DeviceAttributes {
    brightness?: number;
    color?: string;
    [key: string]: any;
}

/**
 * Thông tin chi tiết về thiết bị.
 * @property {number} device_id - ID của thiết bị.
 * @property {string} serial_number - Số serial của thiết bị.
 * @property {number | null} template_id - ID mẫu thiết bị (có thể null).
 * @property {number | null} space_id - ID không gian (có thể null).
 * @property {string | null} account_id - ID tài khoản (có thể null).
 * @property {string | null} hub_id - ID hub (có thể null).
 * @property {number | null} firmware_id - ID firmware (có thể null).
 * @property {string} name - Tên thiết bị.
 * @property {boolean | null} power_status - Trạng thái nguồn (bật/tắt, có thể null).
 * @property {Record<string, any> | null} attribute - Thuộc tính thiết bị (có thể null).
 * @property {string | null} wifi_ssid - Tên wifi (có thể null).
 * @property {string | null} wifi_password - Mật khẩu wifi (có thể null).
 * @property {Record<string, any> | null} current_value - Giá trị hiện tại của thiết bị (có thể null).
 * @property {string | null} link_status - Trạng thái kết nối (có thể null).
 * @property {Date | null} last_reset_at - Thời gian reset gần nhất (có thể null).
 * @property {string | null} lock_status - Trạng thái khóa (có thể null).
 * @property {Date | null} locked_at - Thời gian bị khóa (có thể null).
 * @property {Date | null} created_at - Thời gian tạo (có thể null).
 * @property {Date | null} updated_at - Thời gian cập nhật (có thể null).
 * @property {boolean | null} is_deleted - Đánh dấu đã xóa (có thể null).
 * @property {number | null} device_type_id - ID loại thiết bị (có thể null).
 * @property {string | null} device_type_name - Tên loại thiết bị (có thể null).
 * @property {string | null} device_template_name - Tên mẫu thiết bị (có thể null).
 * @property {string | null} device_template_status - Trạng thái mẫu thiết bị (có thể null).
 * @property {any | null} device_base_capabilities - Khả năng cơ bản của thiết bị (có thể null).
 * @property {any | null} capabilities - Khả năng của thiết bị (có thể null).
 */
export interface Device {
    device_id: string;
    serial_number: string;
    template_id: string | null;
    space_id: number | null;
    account_id: string | null;
    group_id: number | null;
    hub_id: string | null;
    firmware_id: string | null;
    name: string;
    power_status: boolean | null;
    attribute: Record<string, any> | null;
    wifi_ssid: string | null;
    wifi_password: string | null;
    current_value: Record<string, any> | null;
    link_status: string | null;
    last_reset_at: Date | null;
    lock_status: string | null;
    locked_at: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
    // Additional template-related fields
    device_type_id?: number | null;
    device_type_name?: string | null;
    device_template_name?: string | null;
    device_template_status?: string | null;
    device_base_capabilities?: any | null;
    capabilities?: any | null;
    /**
     * Ảnh danh mục cha của loại thiết bị, dạng base64 (nếu có)
     */
    device_type_parent_image?: string | null; // base64
    /**
     * Tên danh mục cha của loại thiết bị (nếu có)
     */
    device_type_parent_name?: string | null;
}