/**
 * Interface `Planning` đại diện cho một kế hoạch sản xuất.
 *
 * @property {string} planning_id - Khóa chính, định danh kế hoạch sản xuất
 * @property {string} name - Tên kế hoạch
 * @property {string | null} description - Mô tả kế hoạch
 * @property {string | null} status - Trạng thái: 'pending', 'in_progress', 'completed'
 * @property {Date | null} start_date - Ngày bắt đầu
 * @property {Date | null} end_date - Ngày kết thúc
 * @property {string | null} created_by - Khóa ngoại, nhân viên tạo kế hoạch
 * @property {Date | null} created_at - Thời gian tạo
 * @property {Date | null} updated_at - Thời gian cập nhật cuối
 * @property {boolean | null} is_deleted - Trạng thái xóa mềm
 */
export interface Planning {
    planning_id: string;
    name: string;
    description: string | null;
    status: string | null;
    start_date: Date | null;
    end_date: Date | null;
    created_by: string | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

/**
 * Interface đầu vào để tạo kế hoạch sản xuất mới.
 *
 * @property {string} name - Tên kế hoạch
 * @property {string} description - Mô tả kế hoạch (tùy chọn)
 * @property {Date} start_date - Ngày bắt đầu (tùy chọn)
 * @property {Date} end_date - Ngày kết thúc (tùy chọn)
 */
export interface PlanningCreateInput {
    name: string;
    description?: string;
    start_date?: Date;
    end_date?: Date;
}

/**
 * Interface đầu vào để cập nhật kế hoạch sản xuất.
 *
 * @property {string} name - Tên kế hoạch (tùy chọn)
 * @property {string} description - Mô tả kế hoạch (tùy chọn)
 * @property {string} status - Trạng thái mới (tùy chọn)
 * @property {Date} start_date - Ngày bắt đầu (tùy chọn)
 * @property {Date} end_date - Ngày kết thúc (tùy chọn)
 */
export interface PlanningUpdateInput {
    name?: string;
    description?: string;
    status?: string;
    start_date?: Date;
    end_date?: Date;
}
