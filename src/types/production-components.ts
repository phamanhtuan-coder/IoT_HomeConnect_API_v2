/**
 * Giao diện cho dữ liệu bảng production_components.
 * @property {number} production_component_id - Khóa chính, tự động tăng.
 * @property {number | null} production_id - Khóa ngoại đến bảng production_tracking.
 * @property {number | null} component_id - Khóa ngoại đến bảng components.
 * @property {number | null} quantity_used - Số lượng linh kiện được sử dụng, mặc định là 1.
 * @property {Date | null} created_at - Thời gian tạo bản ghi.
 * @property {Date | null} updated_at - Thời gian cập nhật bản ghi.
 * @property {boolean | null} is_deleted - Trạng thái xóa mềm, mặc định là false.
 */
export interface ProductionComponent {
    production_component_id: number;
    production_id: number | null;
    component_id: number | null;
    quantity_used: number | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

/**
 * Đầu vào để tạo/cập nhật một thành phần sản xuất.
 * @property {number} production_id - ID của bản ghi sản xuất.
 * @property {number} component_id - ID của linh kiện.
 * @property {number} quantity_used - Số lượng linh kiện được sử dụng.
 */
export interface ProductionComponentInput {
    production_id: number;
    component_id: number;
    quantity_used: number;
}