export enum StatusSerialStage {
    PENDING = 'pending',
    PENDING_ARRIVAL = 'pending_arrival',
    IN_PROGRESS = 'in_progress',
    FIRMWARE_UPLOAD = 'firmware_upload',
    COMPLETED = 'completed',
    PENDING_PACKAGING = 'pending_packaging',
    FIXING = 'fixing',
    FAILED = 'failed'
}

export enum StageSerialStage {
    PENDING = 'pending',
    ASSEMBLY = 'assembly',
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
    completed_at: Date;
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
    production_id: number;
    employee_id: string;
    device_serial: string;
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
    production_id: number;
    employee_id: string;
    device_serial: string;
    note?: string;
}

export interface ProductionTrackingSerialUpdateInput {
    device_serial: string;
    stage: string;
}