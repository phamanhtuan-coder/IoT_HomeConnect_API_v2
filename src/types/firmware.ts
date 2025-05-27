/**
 * Interface Firmware đại diện cho thông tin firmware trong hệ thống.
 * @property {number} firmware_id - ID duy nhất của firmware.
 * @property {string} version - Phiên bản của firmware.
 * @property {string} file_path - Đường dẫn tới file firmware.
 * @property {number | null} template_id - ID của template liên kết (có thể null).
 * @property {boolean | null} is_mandatory - Firmware có bắt buộc không (có thể null).
 * @property {Date | null} created_at - Thời gian tạo firmware (có thể null).
 * @property {Date | null} tested_at - Thời gian kiểm thử firmware (có thể null).
 * @property {boolean | null} is_approved - Firmware đã được duyệt chưa (có thể null).
 * @property {Date | null} updated_at - Thời gian cập nhật firmware (có thể null).
 * @property {boolean | null} is_deleted - Firmware đã bị xóa chưa (có thể null).
 * @property {string | null} note - Ghi chú thêm cho firmware (có thể null).
 */
export interface Firmware {
    firmware_id: number;
    name: string;
    version: string;
    file_path: string;
    template_id: number | null;
    is_mandatory: boolean | null;
    created_at: Date | null;
    tested_at: Date | null;
    is_approved: boolean | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
    note: string | null;
}