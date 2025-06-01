export enum StatusSerialStage {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    PENDING_PACKAGING = 'pending_packaging',
    FIRMWARE_UPLOADED = 'firmware_uploaded', // Firmwware được tải lên
    FIRMWARE_UPLOADING = 'firmware_uploading', // Firmwware đang được tải lên
    FIRMWARE_UPLOAD = 'firmware_upload', // Serial Vừa được chuyển sang giai đoạn filmware
    FIRMWARE_FAILED = 'firmware_failed', // Tải firmware thất bại, cần sửa lại sản phẩm
    TESTING = 'testing', // Serial đang được kiểm tra
    FAILED = 'failed', // Sản phẩm không đạt yêu cầu
    FIXING_LABEL = 'fixing_label', // Nhãn đang được sửa
    FIXING_PRODUCT = 'fixing_product', // Sản phẩm đang được sửa
    FIXING_ALL = 'fixing_all', // Tất cả đang được sửa
}

export enum StageSerialStage {
    PENDING = 'pending',
    ASSEMBLY = 'assembly',
    FIRMWARE_UPLOAD = 'firmware_upload',
    QC = 'qc',
    FIXING = 'fixing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

export enum RejectReason {
    BLUR_ERROR = 'blur_error',
    PRODUCT_ERROR = 'product_error',
    ALL_ERROR = 'all_error',
}

/**
 * Interface `ProductionTracking` đại diện cho một bản ghi theo dõi sản xuất.
 *
 * @property {number} production_id - Khóa chính, tự tăng, định danh bản ghi sản xuất
 * @property {number | null} batch_id - Khóa ngoại, lô sản xuất
 * @property {string | null} device_serial - Khóa ngoại, thiết bị trong lô
 * @property {string} stage - Giai đoạn: 'assembly', 'firmware_upload', 'qc', 'packaging'
 * @property {string | null} status - Trạng thái: 'pending', 'in_progress', 'completed', 'failed'
 * @property {string | null} employee_id - Khóa ngoại, nhân viên được chỉ thực hiện tracking
 * @property {Date | null} started_at - Thời gian bắt đầu giai đoạn
 * @property {Date | null} completed_at - Thời gian hoàn thành giai đoạn
 * @property {number | null} cost - Chi phí cơ bản từ linh kiện
 * @property {Date | null} created_at - Thời gian tạo bản ghi
 * @property {Date | null} updated_at - Thời gian cập nhật cuối
 * @property {boolean | null} is_deleted - Trạng thái xóa mềm
 */
export interface ProductionTracking{
    pending: ProductionTrackingDetailStage[];
    labeling: ProductionTrackingDetailStage[];
    assembly: ProductionTrackingDetailStage[];
    firmware_upload: ProductionTrackingDetailStage[];
    qc: ProductionTrackingDetailStage[];
    completed: ProductionTrackingDetailStage[];
}


export interface ProductionTrackingDetailStage {
    serial_number: string;
    cost: number;
    status: StatusSerialStage;
    stage: StageSerialStage;
    stage_logs: ProductionTrackingStageLog[];
}


export interface ProductionTrackingStageLog {
    stage: string;
    status: string;
    employee_id: string;
    approved_by?: string;
    started_at?: Date;
    completed_at?: Date;
    note?: string; 
}

/**
 * Đầu vào để tạo/cập nhật bản ghi theo dõi sản xuất.
 * @property {number} production_id - ID của bản ghi theo dõi sản xuất
 * @property {string} device_serial - Serial number của thiết bị
 * @property {string} stage - Giai đoạn sản xuất ('assembly', 'firmware_upload', 'qc', 'packaging')
 * @property {string} status - Trạng thái ('pending', 'in_progress', 'completed', 'failed')
 */
export interface ProductionTrackingNextStageInput {
    employee_id: string;
    production_id: number;
    device_serial: string;
    stage: StageSerialStage;
    status: StatusSerialStage;
    note?: string;
    role: string;
    approved_by: string;
}

export interface ProductionTrackingResponsePhaseChangeInput {
    production_id: number;
    stage: string;
    status: string;
    note?: string;
    employee_id: string;
    is_approved: boolean;
}

export interface ProductionTrackingRejectForQCInput {
    device_serials: string[];
    note?: string;
    reason?: string;
}

export interface StageLog {
    stage: string;
    status: string;
    employee_id: number;
    approved_by: number | null;
    started_at: string;
    completed_at: string | null;
    note: string;
}

export interface SerialData {
    serial: string;
    status: string;
    stage_logs: StageLog[];
}

export interface ProductionTrackingResponse {
    [stage: string]: SerialData[];  // stage: pending, assembly, labeling, firmware_upload, qc, completed
}

export interface ProductionTrackingCancelInput {
    device_serials: string[];
    note?: string;
}

export interface ProductionTrackingSerialUpdateInput {
    device_serial: string;
    stage: string;
    status: string;
}

export interface ProductionTrackingApproveInput {
    device_serials: string[];
}

export interface ProductionTrackingApproveTestedInput {
    device_serials: string[];
    note?: string;
}