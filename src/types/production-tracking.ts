/**
 * Interface `ProductionTracking` đại diện cho một bản ghi theo dõi sản xuất.
 *
 * @property {number} production_id - Khóa chính, tự tăng, định danh bản ghi sản xuất
 * @property {string | null} batch_id - Khóa ngoại, lô sản xuất (renamed from production_batch_id for backwards compatibility)
 * @property {string | null} device_serial - Khóa ngoại, thiết bị trong lô
 * @property {string} stage - Giai đoạn: 'assembly', 'firmware_upload', 'qc', 'packaging'
 * @property {string | null} status - Trạng thái: 'pending', 'in_progress', 'completed', 'failed'
 * @property {string | null} employee_id - Khóa ngoại, nhân viên được chỉ thực hiện tracking
 * @property {Date | null} started_at - Thời gian bắt đầu giai đoạn
 * @property {Date | null} completed_at - Thời gian hoàn thành giai đoạn
 * @property {Date | null} created_at - Thời gian tạo bản ghi
 * @property {Date | null} updated_at - Thời gian cập nhật cuối
 * @property {boolean | null} is_deleted - Trạng thái xóa mềm
 */
export interface ProductionTracking {
    production_id: number;
    batch_id: string | null;
    device_serial: string | null;
    stage: string;
    status: string | null;
    employee_id: string | null;
    started_at: Date | null;
    completed_at: Date | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}

/**
 * Đầu vào để tạo/cập nhật bản ghi theo dõi sản xuất.
 * @property {string} batch_id - ID của lô sản xuất (production_batch_id in database)
 * @property {string} device_serial - Serial number của thiết bị
 * @property {string} stage - Giai đoạn sản xuất ('assembly', 'firmware_upload', 'qc', 'packaging')
 * @property {string} status - Trạng thái ('pending', 'in_progress', 'completed', 'failed')
 * @property {any} state_logs - Thông tin trạng thái (tùy chọn)
 */
export interface ProductionTrackingInput {
    batch_id: string;
    device_serial: string;
    stage: string;
    status?: string;
    state_logs?: any;
}
