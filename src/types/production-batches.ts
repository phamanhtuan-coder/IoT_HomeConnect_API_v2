/**
 * Interface `ProductionBatch` đại diện cho một lô sản xuất.
 *
 * @property {number} batch_id - Khóa chính, index của lô sản xuất
 * @property {string} production_batch_id - Khóa chính, định danh lô sản xuất
 * @property {string} planning_id - Khóa chính, định danh kế hoạch sản xuất
 * @property {number} template_id - Khóa ngoại, mẫu thiết bị sản xuất
 * @property {number} quantity - Số lượng thiết bị trong lô
 * @property {string} status - Trạng thái: 'pending', 'pendingimport', 'rejected', 'in_progress', 'completed'
 * @property {string | null} batch_note - Ghi chú lô sản xuất
 * @property {string} created_by - Khóa ngoại, nhân viên tạo lô
 * @property {Date} created_at - Thời gian tạo lô
 * @property {string | null} approved_by - Khóa ngoại, nhân viên duyệt lô
 * @property {Date | null} approved_at - Thời gian duyệt lô
 * @property {Date} updated_at - Thời gian cập nhật cuối
 * @property {boolean} is_deleted - Trạng thái xóa mềm
 * @property {DeviceTemplate | null} device_templates - Thông tin mẫu thiết bị
 * @property {Planning | null} planning - Thông tin kế hoạch
 * @property {ProductionTracking[] | null} production_tracking - Thông tin theo dõi sản xuất
 * @property {BatchLog[] | null} logs - Thông tin log lô sản xuất
 */
export interface ProductionBatch {
    batch_id: number;
    production_batch_id: string;
    planning_id: string;
    template_id: number;
    quantity: number;
    status: string;
    batch_note?: string;
    created_by: string;
    created_at: Date;
    approved_by?: string;
    approved_at?: Date;
    updated_at: Date;
    is_deleted: boolean;
    device_templates?: DeviceTemplate;
    planning?: {
        planning_id: string;
        planning_note?: string;
        status: string;
        created_by: string;
        created_at: Date;
        updated_at: Date;
    };
    production_tracking?: {
        tracking_id: number;
        batch_id: number;
        quantity_produced: number;
        quantity_defective: number;
        tracking_note?: string;
        created_by: string;
        created_at: Date;
        updated_at: Date;
    }[];
    logs?: BatchLog[];
}

/**
 * Interface đầu vào để tạo lô sản xuất mới.
 *
 * @property {number} template_id - ID của mẫu thiết bị
 * @property {number} quantity - Số lượng thiết bị cần sản xuất
 * @property {string | null} batch_note - Ghi chú lô sản xuất
 */
export interface ProductionBatchCreateInput {
    template_id: number;
    quantity: number;
    batch_note?: string;
}

/**
 * Interface đầu vào để cập nhật lô sản xuất.
 *
 * @property {string} status - Trạng thái mới của lô
 * @property {string | null} batch_note - Ghi chú lô sản xuất
 * @property {string | null} update_notes - Ghi chú cập nhật lô
 */
export interface ProductionBatchUpdateInput {
    status?: string;
    batch_note?: string;
    update_notes?: string;
}

export interface BatchLog {
    log_id: number;
    batch_id: number;
    action: string;
    status: string;
    note: string;
    created_by: string;
    created_at: Date;
}

export interface DeviceTemplate {
    template_id: number;
    name: string;
    device_template_note?: string;
    status: boolean;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    categories?: any;
    firmware?: any[];
}
