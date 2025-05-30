/**
 * Giao diện DeviceTemplate đại diện cho mẫu thiết bị trong hệ thống.
 * @property {number} template_id - ID duy nhất của mẫu thiết bị.
 * @property {number | null} device_type_id - ID loại thiết bị, có thể null nếu chưa xác định.
 * @property {string} name - Tên của mẫu thiết bị.
 * @property {string | null} created_by - Người tạo mẫu thiết bị, có thể null.
 * @property {Date | null} created_at - Thời gian tạo, có thể null.
 * @property {Date | null} updated_at - Thời gian cập nhật gần nhất, có thể null.
 * @property {boolean | null} is_deleted - Trạng thái xóa mềm, có thể null.
 */
export interface DeviceTemplate {
    template_id: number;
    device_type_id: number | null;
    category_name: string | null;
    name: string;
    created_by: string | null;
    created_name: string | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
    status: string | null
    production_cost: number | null;
    device_template_note: string | null;
    components: [] | null;
}