/**
 * Interface `ProductionBatch` đại diện cho một lô sản xuất.
 *
 * @property {number} batch_id - Khóa chính, index của lô sản xuất
 * @property {string} production_batch_id - Khóa chính, định danh lô sản xuất
 * @property {string} planning_id - Khóa chính, định danh kế hoạch sản xuất
 * @property {number | null} template_id - Khóa ngoại, mẫu thiết bị sản xuất
 * @property {number} quantity - Số lượng thiết bị trong lô
 * @property {string | null} status - Trạng thái: 'pending', 'approved', 'rejected', 'in_progress', 'completed'
 * @property {string | null} created_by - Khóa ngoại, nhân viên tạo lô
 * @property {Date | null} created_at - Thời gian tạo lô
 * @property {string | null} approved_by - Khóa ngoại, nhân viên duyệt lô
 * @property {Date | null} approved_at - Thời gian duyệt lô
 * @property {Date | null} updated_at - Thời gian cập nhật cuối
 * @property {boolean | null} is_deleted - Trạng thái xóa mềm
 */
export interface ProductionBatch {
    batch_id: number;
    production_batch_id: string;
    planning_id: string;
    template_id: number | null;
    quantity: number;
    status: string | null;
    created_by: string | null;
    created_at: Date | null;
    approved_by: string | null;
    approved_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

/**
 * Interface đầu vào để tạo lô sản xuất mới.
 *
 * @property {number} template_id - ID của mẫu thiết bị
 * @property {number} quantity - Số lượng thiết bị cần sản xuất
 */
export interface ProductionBatchCreateInput {
    template_id: number;
    quantity: number;
}

/**
 * Interface đầu vào để cập nhật lô sản xuất.
 *
 * @property {number} template_id - ID của mẫu thiết bị (tùy chọn)
 * @property {string} status - Trạng thái mới của lô (tùy chọn)
 * @property {number} quantity - Số lượng thiết bị mới (tùy chọn)
 */
export interface ProductionBatchUpdateInput {
    template_id?: number;
    status?: string;
    quantity?: number;
}
