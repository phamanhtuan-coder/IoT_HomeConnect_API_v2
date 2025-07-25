/**
 * Interface `Component` đại diện cho một linh kiện trong hệ thống.
 *
 * @property {number} component_id - Mã định danh duy nhất của linh kiện.
 * @property {string} name - Tên của linh kiện.
 * @property {string | null} [supplier] - Nhà cung cấp (có thể không có).
 * @property {number | null} [unit_cost] - Giá mỗi đơn vị (có thể không có).
 * @property {Date | null} [created_at] - Ngày tạo (có thể không có).
 * @property {Date | null} [updated_at] - Ngày cập nhật cuối (có thể không có).
 * @property {boolean | null} [is_deleted] - Đánh dấu đã xóa (có thể không có).
 */
interface Component {
    component_id: string;
    name: string;
    supplier?: string | null;
    unit_cost?: number | null;
    created_at?: Date | null;
    updated_at?: Date | null;
    is_deleted?: boolean | null;
    status?: number | null;
    flow_type?: string | null;
    default_value?: string | null;
    datatype?: string | null;
    unit?: string | null;
    min?: number | null;
    max?: number | null;
    name_display?: string | null
}

interface ComponentResponse {
    success: number;
    data: Component[] | Component | null;
    message: string;
}

export {Component, ComponentResponse }