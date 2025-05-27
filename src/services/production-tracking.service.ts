import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { ProductionTracking, ProductionTrackingNextStageInput, StageSerialStage, StatusSerialStage, ProductionTrackingRejectForQCInput, ProductionTrackingResponsePhaseChangeInput, RejectReason } from '../types/production-tracking';

export class ProductionTrackingService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async RequestPhaseChange(input: ProductionTrackingNextStageInput) {
        const { production_id, device_serial, stage, status, note, role, employee_id } = input;

        const production = await this.prisma.production_tracking.findUnique({
            where: { production_id: production_id , is_deleted: false },
            select: {
                state_logs: true,
            }
        });

        if (!production) {
            return throwError(ErrorCodes.PRODUCTION_NOT_FOUND, 'Production not found');
        }
        
        let newStage: StageSerialStage | null = null;
        let stageLogList: any[] = production.state_logs as any[];
        let stageLog: any = null;
        let isUpdate = false;
        // Xử lý giai đoạn PENDING
        if (stage === StageSerialStage.PENDING) {
            if (role !== 'PRODUCTION') {
                return throwError(ErrorCodes.UNAUTHORIZED, 'Chỉ có nhân viên sản xuất mới thực hiện được yêu cầu duyệt giai đoạn này');
            }
            newStage = StageSerialStage.ASSEMBLY;
            stageLog = {
                stage: stage,
                status: StatusSerialStage.COMPLETED,
                employee_id: input.employee_id,
                approved_by: input.employee_id,
                started_at: new Date(),
                completed_at: new Date(),
                note: note
            };
            stageLogList.push(stageLog);

            stageLog = {
                stage: StageSerialStage.ASSEMBLY,
                status: StatusSerialStage.PENDING_ARRIVAL,
                employee_id: input.employee_id,
                started_at: new Date(),
                note: note
            };
            stageLogList.push(stageLog);
            isUpdate = true;
        }

        // Xử lý giai đoạn ASSEMBLY
        else if (stage === StageSerialStage.ASSEMBLY) {
            if (role !== 'PRODUCTION') {
                return throwError(ErrorCodes.UNAUTHORIZED, 'Chỉ có nhân viên sản xuất mới thực hiện được yêu cầu duyệt giai đoạn này');
            }
            
            // Kiểm tra xem có phải đang làm không
            let stageLogBefore = stageLogList.find(log => log.stage === StageSerialStage.ASSEMBLY && (log.status === StatusSerialStage.IN_PROGRESS || log.status === StatusSerialStage.FIXING));
            if (!stageLogBefore) {
                return throwError(ErrorCodes.UNAUTHORIZED, 'Chỉ có stage log trước đó đang làm hoặc đang sửa lỗi mới được duyệt giai đoạn này');
            }

            // Cập nhật lại status của log trước đó
            stageLogList[stageLogList.length - 1].status = StatusSerialStage.COMPLETED;
            stageLogList[stageLogList.length - 1].completed_at = new Date();
            stageLogList[stageLogList.length - 1].note = note;
            stageLogList[stageLogList.length - 1].approved_by = input.employee_id;

            newStage = StageSerialStage.LABELLING;
            stageLog = {
                stage: newStage,
                status: StatusSerialStage.PENDING_ARRIVAL,
                employee_id: input.employee_id,
                approved_by: null,
                started_at: new Date(),
                note: note
            };
            stageLogList.push(stageLog);
            isUpdate = true;
        }
            
        // Xử lý giai đoạn LABELLING
        else if (stage === StageSerialStage.LABELLING) {
            // Lấy dữ liệu của log trước đó, kiểm tra xem có phải đang làm không
            // status === 'in_progress'
            if (role !== '') {
                return throwError(ErrorCodes.UNAUTHORIZED, 'Only R&D can complete labeling stage');
            }

            // Kiểm tra xem có phải đang làm không
            let stageLogBefore = stageLogList.find(log => log.stage === StageSerialStage.LABELLING && (log.status === StatusSerialStage.IN_PROGRESS || log.status === StatusSerialStage.FIXING));
            if (!stageLogBefore) {
                return throwError(ErrorCodes.UNAUTHORIZED, 'Chỉ có stage log trước đó đang làm hoặc đang sửa lỗi mới được duyệt giai đoạn này');
            }


            // Cập nhật lại status của log trước đó
            stageLogList[stageLogList.length - 1].status = StatusSerialStage.COMPLETED;
            stageLogList[stageLogList.length - 1].completed_at = new Date();
            stageLogList[stageLogList.length - 1].note = note;
            stageLogList[stageLogList.length - 1].approved_by = input.employee_id;

            newStage = StageSerialStage.FIRMWARE_UPLOAD;
            stageLog = {
                stage: newStage,
                status: StatusSerialStage.PENDING_ARRIVAL,
                employee_id: input.employee_id,
                approved_by: null,
                started_at: new Date(),
            };
            stageLogList.push(stageLog);
            isUpdate = true;
        }
            
        // Handle FIRMWARE_UPLOAD stage
        else if (stage === StageSerialStage.FIRMWARE_UPLOAD) {
            if (role !== 'TECHNICAL') {
                return throwError(ErrorCodes.UNAUTHORIZED, 'Chỉ có nhân viên kỹ thuật mới thực hiện được yêu cầu duyệt giai đoạn này');
            }

            // Kiểm tra xem có phải đang làm không
            let stageLogBefore = stageLogList.find(log => log.stage === StageSerialStage.FIRMWARE_UPLOAD && (log.status === StatusSerialStage.IN_PROGRESS || log.status === StatusSerialStage.FIXING));
            if (!stageLogBefore) {
                return throwError(ErrorCodes.UNAUTHORIZED, 'Chỉ có stage log trước đó đang làm hoặc đang sửa lỗi mới được duyệt giai đoạn này');
            }
            
            // Cập nhật lại status của log trước đó
            stageLogList[stageLogList.length - 1].status = StatusSerialStage.COMPLETED;
            stageLogList[stageLogList.length - 1].completed_at = new Date();
            stageLogList[stageLogList.length - 1].note = note;
            stageLogList[stageLogList.length - 1].approved_by = input.employee_id;

            newStage = StageSerialStage.QC;
            stageLog = {
                stage: stage,
                status: StatusSerialStage.PENDING_ARRIVAL,
                employee_id: input.employee_id,
                approved_by: null,
                started_at: new Date(),
                note: note
            };
            stageLogList.push(stageLog);
        }
        
        // Handle QC stage
        else if (stage === StageSerialStage.QC) {
            if (role !== 'QC') {
                return throwError(ErrorCodes.UNAUTHORIZED, 'Chỉ có nhân viên kiểm tra chất lượng mới thực hiện được yêu cầu duyệt giai đoạn này');
            }

            // Kiểm tra xem có phải đang làm không
            let stageLogBefore = stageLogList.find(log => log.stage === StageSerialStage.QC && (log.status === StatusSerialStage.IN_PROGRESS || log.status === StatusSerialStage.FIXING));
            if (!stageLogBefore) {
                return throwError(ErrorCodes.UNAUTHORIZED, 'Chỉ có stage log trước đó đang làm hoặc đang sửa lỗi mới được duyệt giai đoạn này');
            }

            // Cập nhật lại status của log trước đó
            stageLogList[stageLogList.length - 1].status = StatusSerialStage.COMPLETED;
            stageLogList[stageLogList.length - 1].completed_at = new Date();
            stageLogList[stageLogList.length - 1].note = note;
            stageLogList[stageLogList.length - 1].approved_by = input.employee_id;

            newStage = StageSerialStage.COMPLETED;
            stageLog = {
                stage: stage,
                status: StatusSerialStage.PENDING_ARRIVAL,
                employee_id: input.employee_id,
                approved_by: null,
                started_at: new Date(),
                note: note
            };
            stageLogList.push(stageLog);
            isUpdate = true;
        }

        if (isUpdate) {
            await this.prisma.production_tracking.update({
                where: { production_id: production_id },
                data: { state_logs: stageLogList }
            });
            return {
                success: true,
                errorCode: null,
                data: {
                    production_id: production_id,
                    stageLogList: stageLogList
                }
            }
        }

        return {
            success: false,
            errorCode: ErrorCodes.UNAUTHORIZED,
            message: 'Cập nhật giai đoạn cho sản phẩm với serial: ' + device_serial + ' thất bại!'
        }
    }   
    
    async ResponsePhaseChange(input: ProductionTrackingResponsePhaseChangeInput) {
        const { production_id, employee_id, is_approved, note } = input;

        const production = await this.prisma.production_tracking.findUnique({
            where: { production_id: production_id , is_deleted: false },
            select: {
                state_logs: true,
            }
        });

        if (!production) {
            return throwError(ErrorCodes.PRODUCTION_NOT_FOUND, 'Production not found');
        }

        let stageLogList = production.state_logs as any[];

        let stageLogLast = stageLogList[stageLogList.length - 1];
        if (stageLogLast.status !== StatusSerialStage.PENDING_ARRIVAL) {
            return throwError(ErrorCodes.BAD_REQUEST, 'Stage log được yêu cầu duyệt');
        }

        if (stageLogLast.approved_by !== employee_id) {
            return throwError(ErrorCodes.BAD_REQUEST, 'Bạn không có quyền duyệt giai đoạn này');
        }

        if (is_approved) {
            stageLogLast.status = StatusSerialStage.COMPLETED;
        } else {
            stageLogLast.status = StatusSerialStage.FAILED;
        }

        stageLogLast.completed_at = new Date();
        stageLogLast.approved_by = employee_id;
        stageLogLast.note = note;

        await this.prisma.production_tracking.update({
            where: { production_id: production_id },
            data: { state_logs: stageLogList }
        });

        return {
            success: true,
            errorCode: null,
            message: 'Duyệt giai đoạn thành công'
        }
    }

    async RejectProductionSerial(input: ProductionTrackingRejectForQCInput) {
        const { production_id, employee_id, device_serial, reason, note } = input;

        const production = await this.prisma.production_tracking.findUnique({
            where: { production_id: production_id , is_deleted: false },
            select: {
                state_logs: true,
            }
        });

        if (!production) {
            return throwError(ErrorCodes.PRODUCTION_NOT_FOUND, 'Production not found');
        }

        let stageLogList = production.state_logs as any[];
        let stageLogLast = stageLogList[stageLogList.length - 1];
        if (stageLogLast.stage !== StageSerialStage.QC  
            && ( stageLogLast.status !== StatusSerialStage.PENDING_ARRIVAL
            || stageLogLast.status !== StatusSerialStage.IN_PROGRESS))
        {
            return throwError(ErrorCodes.BAD_REQUEST, 'Stage log được yêu cầu duyệt');
        }
        
        stageLogLast.status = StatusSerialStage.FAILED;
        stageLogLast.completed_at = new Date();
        stageLogLast.approved_by = employee_id;
        stageLogLast.note = note;
        
        let stageUpdate
        if (reason === RejectReason.BLUR_ERROR) {
            stageUpdate = StageSerialStage.LABELLING;
        } else if (reason === RejectReason.PRODUCT_ERROR) {
            stageUpdate = StageSerialStage.ASSEMBLY;
        } else if (reason === RejectReason.ALL_ERROR) {
            stageUpdate = StageSerialStage.ASSEMBLY;
        }

        await this.prisma.production_tracking.update({
            where: { production_id: production_id },
            data: { state_logs: stageLogList, stage: stageUpdate, status: StatusSerialStage.FIXING }
        });
        

    }
}

