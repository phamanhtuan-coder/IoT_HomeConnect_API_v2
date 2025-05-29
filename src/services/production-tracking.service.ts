import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { ProductionTracking, ProductionTrackingNextStageInput, StageSerialStage, StatusSerialStage, ProductionTrackingRejectForQCInput, ProductionTrackingResponsePhaseChangeInput, RejectReason, ProductionTrackingResponse, SerialData, StageLog, ProductionTrackingCancelInput, ProductionTrackingSerialUpdateInput } from '../types/production-tracking';
import sseController from '../controllers/sse.controller';

function errorResponse(errorCode: ErrorCodes, message: string) {
    return {
        success: false,
        errorCode: errorCode,
        message: message
    }
}

export class ProductionTrackingService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async getProductionTrackingByProductionBatchId(production_batch_id: string): Promise<any> {
        try {
            // Lấy tất cả production tracking records
            const productions = await this.prisma.production_tracking.findMany({
                where: { 
                    is_deleted: false,
                    production_batch_id: production_batch_id
                },
                select: {
                    production_id: true,
                    device_serial: true,
                    stage: true,
                    status: true,
                    state_logs: true
                }
            });
    
            // Khởi tạo object để group theo stage
            const result: ProductionTrackingResponse = {
                pending: [],
                assembly: [],
                labeling: [],
                firmware_upload: [],
                qc: [],
                completed: []
            };
    
            // Map dữ liệu theo yêu cầu
            productions.forEach(production => {
                const serialData: SerialData = {
                    serial: production.device_serial || '',
                    status: production.status.toLowerCase(),
                    stage_logs: (production.state_logs as any[]).map(log => ({
                        stage: log.stage.toLowerCase(),
                        status: log.status.toLowerCase(),
                        employee_id: log.employee_id,
                        approved_by: log.approved_by,
                        started_at: log.started_at,
                        completed_at: log.completed_at,
                        note: log.note || ''
                    }))
                };
    
                // Thêm vào stage tương ứng
                const stage = production.stage.toLowerCase();
                if (result[stage]) {
                    result[stage].push(serialData);
                }
            });
    
            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Error getting production tracking by stages:', error);
            return throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to get production tracking data');
        }
    }

    async getProductionTrackingByStage(stage: string) {
        try {
            const productions = await this.prisma.production_tracking.findMany({
                where: { 
                    is_deleted: false,
                    stage: stage.toUpperCase()
                },
                select: {
                    production_id: true,
                    device_serial: true,
                    stage: true,
                    status: true,
                    state_logs: true
                }
            });
    
            const serialDataList = productions.map(production => ({
                serial: production.device_serial,
                status: production.status.toLowerCase(),
                stage_logs: (production.state_logs as any[]).map(log => ({
                    stage: log.stage.toLowerCase(),
                    status: log.status.toLowerCase(),
                    employee_id: log.employee_id,
                    approved_by: log.approved_by,
                    started_at: log.started_at,
                    completed_at: log.completed_at,
                    note: log.note || ''
                }))
            }));
    
            return {
                success: true,
                data: {
                    [stage.toLowerCase()]: serialDataList
                }
            };
        } catch (error) {
            console.error(`Error getting production tracking for stage ${stage}:`, error);
            return throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to get production tracking data');
        }
    }
    
    async ResponsePhaseChange(input: ProductionTrackingResponsePhaseChangeInput) {
        const { production_id, employee_id, is_approved, note } = input;

        const production = await this.prisma.production_tracking.findFirst({
            where: { production_id: production_id , is_deleted: false },
            select: {
                state_logs: true,
            }
        });

        if (!production) {
            return errorResponse(ErrorCodes.PRODUCTION_NOT_FOUND, 'Production not found');
        }

        let stageLogList = production.state_logs as any[];

        let stageLogLast = stageLogList[stageLogList.length - 1];
        if (stageLogLast.status !== StatusSerialStage.PENDING_ARRIVAL) {
            return errorResponse(ErrorCodes.BAD_REQUEST, 'Stage log không trong giai đoạn được yêu cầu duyệt');
        }

        if (is_approved) {
            stageLogLast.status = StatusSerialStage.IN_PROGRESS;
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

        const production = await this.prisma.production_tracking.findFirst({
            where: { production_id: production_id , is_deleted: false },
            select: {
                state_logs: true,
            }
        });

        if (!production) {
            return errorResponse(ErrorCodes.PRODUCTION_NOT_FOUND, 'Production not found');
        }

        let stageLogList = production.state_logs as any[];
        let stageLogLast = stageLogList[stageLogList.length - 1];
        if (stageLogLast.stage !== StageSerialStage.QC  
            && stageLogLast.status !== StatusSerialStage.IN_PROGRESS)
        {
            return errorResponse(ErrorCodes.BAD_REQUEST, 'Stage log được yêu cầu duyệt');
        }
        
        stageLogLast.status = StatusSerialStage.FAILED;
        stageLogLast.completed_at = new Date();
        stageLogLast.approved_by = employee_id;
        stageLogLast.note = note;
        
        let stageUpdate
        if (reason) {
            stageUpdate = StageSerialStage.ASSEMBLY;
        }

        await this.prisma.production_tracking.update({
            where: { production_id: production_id },
            data: { state_logs: stageLogList, stage: stageUpdate, status: StatusSerialStage.FIXING }
        });
    }

    async ResponseCancelProductionSerial(input: ProductionTrackingCancelInput) {
        const { production_id, employee_id, device_serial, note } = input;

        const production = await this.prisma.production_tracking.findFirst({
            where: { production_id: production_id , is_deleted: false },
            select: {
                state_logs: true,
            }
        });

        if (!production) {
            return errorResponse(ErrorCodes.PRODUCTION_NOT_FOUND, 'Production not found');
        }

        let stageLogList = production.state_logs as any[];
        let stageLogLast = stageLogList[stageLogList.length - 1];
        if (stageLogLast.status !== StatusSerialStage.PENDING_ARRIVAL
        ) {
            return errorResponse(ErrorCodes.BAD_REQUEST, 'Stage log được yêu cầu duyệt');
        }

        stageLogLast.status = StatusSerialStage.COMPLETED;
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
            message: 'Hủy sản xuất sản phẩm thành công'
        }
    }

    async UpdateProductionSerial(input: ProductionTrackingSerialUpdateInput, employeeId: string) {
        const { device_serial, stage } = input;

        const production = await this.prisma.production_tracking.findFirst({
            where: { device_serial: device_serial, is_deleted: false },
        });
        
        if(!production) {
            return errorResponse(ErrorCodes.PRODUCTION_NOT_FOUND, 'Production not found');
        }

        if (production.stage !== stage) {
            return errorResponse(ErrorCodes.BAD_REQUEST, 'Stage is not the same');
        }

        let stageLogList = production.state_logs as any[];
        let stageLog = stageLogList[stageLogList.length - 1];
        
        if (stage === StageSerialStage.ASSEMBLY) {
            if (production.status === StatusSerialStage.IN_PROGRESS) {
                stageLog = {
                    stage: stage,
                    status: StatusSerialStage.COMPLETED,
                    employee_id: employeeId,
                    approved_by: employeeId,
                    started_at: new Date(),
                    completed_at: new Date()
                };
                stageLogList.push(stageLog);

                let newLog = {
                    stage: StageSerialStage.ASSEMBLY,
                    status: StatusSerialStage.FIRMWARE_UPLOAD,
                    employee_id: employeeId,
                    started_at: new Date()
                };
                stageLogList.push(newLog);

                // Gửi SSE update
                sseController.sendProductionUpdate({
                    type: 'update_status',
                    device_serial: device_serial,
                    stage: StageSerialStage.ASSEMBLY,
                    status: StatusSerialStage.FIRMWARE_UPLOAD,
                    stage_logs: stageLogList
                });
            }else if (production.status === StatusSerialStage.FIRMWARE_UPLOAD) {
                stageLog = {
                    stage: stage,
                    status: StatusSerialStage.COMPLETED,
                    employee_id: employeeId,
                    approved_by: employeeId,
                    started_at: new Date(),
                    completed_at: new Date()
                };
                stageLogList.push(stageLog);

                let newLog = {
                    stage: StageSerialStage.QC,
                    status: StatusSerialStage.IN_PROGRESS,
                    employee_id: employeeId,
                    started_at: new Date()
                };
                stageLogList.push(newLog);

                sseController.sendProductionUpdate({
                    type: 'update_stage',
                    device_serial: device_serial,
                    stage: StageSerialStage.QC,
                    status: StatusSerialStage.IN_PROGRESS,
                    stage_logs: stageLogList
                });
            } else {
                return errorResponse(ErrorCodes.BAD_REQUEST, 'Stage log không trong giai đoạn được yêu cầu duyệt');
            }
        }

        else if (stage === StageSerialStage.QC) {
            if (production.status === StatusSerialStage.IN_PROGRESS) {
                // Hoàn thành stage QC
                stageLog = {
                    stage: stage,
                    status: StatusSerialStage.COMPLETED,
                    approved_by: employeeId,
                    completed_at: new Date()
                };
                stageLogList.push(stageLog);

                // Tạo log mới cho completed stage
                let newLog = {
                    stage: StageSerialStage.COMPLETED,
                    status: StatusSerialStage.PENDING_PACKAGING,
                    employee_id: employeeId,
                    started_at: new Date()
                };
                stageLogList.push(newLog);
                sseController.sendProductionUpdate({
                    type: 'update_stage',
                    device_serial: device_serial,
                    stage: StageSerialStage.COMPLETED,
                    status: StatusSerialStage.PENDING_PACKAGING,
                    stage_logs: stageLogList
                });
            }
        }

        else if (stage === StageSerialStage.COMPLETED) {
            if (production.status === StatusSerialStage.PENDING_PACKAGING) {
                stageLog = {
                    stage: stage,
                    status: StatusSerialStage.COMPLETED,
                    approved_by: employeeId,
                    completed_at: new Date()
                };
                stageLogList.push(stageLog);
            }

            sseController.sendProductionUpdate({
                type: 'update_status',
                device_serial: device_serial,
                stage: stage,
                status: StatusSerialStage.PENDING_PACKAGING,
                stage_logs: stageLogList
            });
        }

        // Cập nhật database
        await this.prisma.production_tracking.update({
            where: { production_id: production.production_id },
            data: { 
                stage: stageLogList[stageLogList.length - 1].stage, 
                status: stageLogList[stageLogList.length - 1].status,
                state_logs: stageLogList 
            }
        });

        return {
            success: true,
            errorCode: null,
            message: 'Cập nhật giai đoạn thành công'
        }
    }
}