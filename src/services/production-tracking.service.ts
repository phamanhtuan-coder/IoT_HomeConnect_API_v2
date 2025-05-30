import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { ProductionTracking, ProductionTrackingNextStageInput, StageSerialStage, StatusSerialStage, ProductionTrackingRejectForQCInput, ProductionTrackingResponsePhaseChangeInput, RejectReason, ProductionTrackingResponse, SerialData, StageLog, ProductionTrackingCancelInput, ProductionTrackingSerialUpdateInput, ProductionTrackingApproveInput } from '../types/production-tracking';
import sseController from '../controllers/sse.controller';

function errorResponse(errorCode: ErrorCodes, message: string, data: any[] = []) {
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

    async ApproveProductionSerial(input: ProductionTrackingApproveInput, employeeId: string): Promise<any> {
        try {
            const { device_serials } = input;

            if (device_serials.length === 0) {
                return errorResponse(ErrorCodes.BAD_REQUEST, 'Danh sách serial trống');
            }

            const production_list = await this.prisma.production_tracking.findMany({
                where: { is_deleted: false, stage: StageSerialStage.PENDING, device_serial: { in: device_serials } },
                select: {
                    production_id: true,
                    device_serial: true,
                    stage: true,
                    status: true,
                    state_logs: true
                }
            });
            
            if (production_list.length !== device_serials.length) {
                return errorResponse(ErrorCodes.PRODUCTION_NOT_FOUND, 'Dữ liệu danh sách serial trong giai đoạn cần duyệt hoặc không tồn tại!');
            }

            let stage_log = [{
                stage: StageSerialStage.ASSEMBLY,
                status: StatusSerialStage.IN_PROGRESS,
                employee_id: employeeId,
                started_at: new Date()
            }];

            await this.prisma.$transaction(async (tx) => {
                for (const production of production_list) {
                    await tx.production_tracking.update({
                        where: { production_id: production.production_id },
                        data: { stage: StageSerialStage.ASSEMBLY, status: StatusSerialStage.IN_PROGRESS, state_logs: stage_log }
                    });
                }
            });
            
            for (const production of production_list) {
                sseController.sendProductionUpdate({
                    type: 'update_stage',
                    device_serial: production.device_serial || '',
                    stage: StageSerialStage.ASSEMBLY,
                    status: StatusSerialStage.IN_PROGRESS,
                    stage_logs: stage_log
                });
            }

            return {
                success: true,
                errorCode: null,
                message: 'Duyệt sản phẩm thành công',
            }
        } catch (error) {
            console.error("Error approving production serial:", error);
        }
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
                qc: [],
                completed: []
            };
    
            // Map dữ liệu theo yêu cầu
            productions.forEach(production => {
                console.log(production);
                const serialData: SerialData = {
                    serial: production.device_serial || '',
                    status: production.status.toLowerCase(),
                    stage_logs: (production.state_logs as any[])?.map(log => ({
                        stage: log?.stage.toLowerCase(),
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

    async RejectProductionSerial(input: ProductionTrackingRejectForQCInput, employeeId: string) {
        const { device_serials, reason, note } = input;

        const production_list = await this.prisma.production_tracking.findMany({
            where: { device_serial: { in: device_serials }, is_deleted: false },
            select: {
                production_id: true,
                device_serial: true,
                state_logs: true,
                stage: true,
                status: true
            }
        });

        console.log(device_serials);

        if (production_list.length !== device_serials?.length) {
            return errorResponse(ErrorCodes.PRODUCTION_NOT_FOUND, 'Production not found');
        }

        let error_list = [];

        await this.prisma.$transaction(async (tx: any) => {
            for (const production of production_list) {
                if (production.stage !== StageSerialStage.QC) {
                    error_list.push({
                        device_serial: production.device_serial,
                        error: 'Serial không trong giai đoạn kiểm thử để thực hiện chức năng này'
                    });
                }
            }

            if (error_list.length > 0) {
                return errorResponse(ErrorCodes.BAD_REQUEST, 'Có sản phẩm không thể từ chối vì nằm ngoài giai đoạn', error_list);
            }

            let newStatus;

            if (reason === RejectReason.BLUR_ERROR) {
                newStatus = StatusSerialStage.FIXING_LABEL;
            } else if (reason === RejectReason.PRODUCT_ERROR) {
                newStatus = StatusSerialStage.FIXING_PRODUCT;
            } else {
                newStatus = StatusSerialStage.FIXING_ALL;
            }

            let newStageLog = {
                stage: StageSerialStage.ASSEMBLY,
                status: newStatus,
                employee_id: employeeId,
                started_at: new Date()
            };

            for (const production of production_list) {
                const currentLogs = production.state_logs as any[];
                const updatedLogs = [...currentLogs, newStageLog];
    
                await tx.production_tracking.update({
                    where: { production_id: production.production_id },
                    data: {
                        stage: StageSerialStage.ASSEMBLY,
                        status: newStatus,
                        state_logs: updatedLogs
                    }
                });
    
                // Gửi SSE update
                sseController.sendProductionUpdate({
                    type: 'update_status',
                    device_serial: production.device_serial || '',
                    stage: StageSerialStage.ASSEMBLY,
                    status: newStatus || '',
                    stage_logs: updatedLogs
                });
            }
        });

        return {
            success: true,
            errorCode: null,
            message: 'Từ chối sản phẩm thành công'
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
        let newStage = stage;
        if (stage === StageSerialStage.ASSEMBLY) {
            if (production.status === StatusSerialStage.IN_PROGRESS) {
                stageLog = {
                    ...stageLog,
                    approved_by: employeeId,
                    completed_at: new Date()
                };
                stageLogList[stageLogList.length - 1] = stageLog;

                let newLog = {
                    stage: StageSerialStage.FIRMWARE_UPLOAD,
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
            } else if (production.status === StatusSerialStage.FIRMWARE_UPLOAD) {
                stageLog = {
                    ...stageLog,
                    approved_by: employeeId,
                    completed_at: new Date()
                };
                stageLogList[stageLogList.length - 1] = stageLog;

                let newLog = {
                    stage: StageSerialStage.FIRMWARE_UPLOAD,
                    status: StatusSerialStage.FIRMWARE_UPLOADING,
                    employee_id: employeeId,
                    started_at: new Date()
                };
                stageLogList.push(newLog);

                sseController.sendProductionUpdate({
                    type: 'update_status',
                    device_serial: device_serial,
                    stage: StageSerialStage.ASSEMBLY,
                    status: StatusSerialStage.FIRMWARE_UPLOADING,
                    stage_logs: stageLogList
                });
            } else if (production.status === StatusSerialStage.FIRMWARE_UPLOADING) {
                stageLog = {
                    ...stageLog,
                    approved_by: employeeId,
                    completed_at: new Date()
                };
                stageLogList[stageLogList.length - 1] = stageLog;

                let newLog = {
                    stage: StageSerialStage.QC,
                    status: StatusSerialStage.FIRMWARE_UPLOADED,
                    employee_id: employeeId,
                    started_at: new Date()
                };
                stageLogList.push(newLog);

                newStage = StageSerialStage.QC;
                
                sseController.sendProductionUpdate({
                    type: 'update_stage',
                    device_serial: device_serial,
                    stage: StageSerialStage.QC,
                    status: StatusSerialStage.FIRMWARE_UPLOADED,
                    stage_logs: stageLogList
                });
            } else if (production.status === StatusSerialStage.FIRMWARE_FAILED) {
                stageLog = {
                    ...stageLog,
                    approved_by: employeeId,
                    completed_at: new Date()
                };
                stageLogList[stageLogList.length - 1] = stageLog;

                let newLog = {
                    stage: StageSerialStage.ASSEMBLY,
                    status: StatusSerialStage.FIXING_PRODUCT,
                    employee_id: employeeId,
                    started_at: new Date()
                };
                stageLogList.push(newLog);

                newStage = StageSerialStage.ASSEMBLY;
                
                sseController.sendProductionUpdate({
                    type: 'update_stage',
                    device_serial: device_serial,
                    stage: StageSerialStage.ASSEMBLY,
                    status: StatusSerialStage.FIXING_PRODUCT,
                    stage_logs: stageLogList
                });
            } else {
                return errorResponse(ErrorCodes.BAD_REQUEST, 'Stage log không trong giai đoạn được yêu cầu duyệt');
            }
        }

        else if (stage === StageSerialStage.QC) {
            if (production.status === StatusSerialStage.FIRMWARE_UPLOADED) {
                stageLog = {
                    ...stageLog,
                    approved_by: employeeId,
                    completed_at: new Date()
                };
                stageLogList[stageLogList.length - 1] = stageLog;
                

                let newLog = {
                    stage: StageSerialStage.QC,
                    status: StatusSerialStage.TESTING,
                    employee_id: employeeId,
                    started_at: new Date()
                };
                stageLogList.push(newLog);

                sseController.sendProductionUpdate({
                    type: 'update_stage',
                    device_serial: device_serial,
                    stage: StageSerialStage.QC,
                    status: StatusSerialStage.TESTING,
                    stage_logs: stageLogList
                });
            }
            else if (production.status === StatusSerialStage.TESTING) {
                // Hoàn thành stage QC
                stageLog = {
                    ...stageLog,
                    approved_by: employeeId,
                    completed_at: new Date()
                };
                stageLogList[stageLogList.length - 1] = stageLog;

                // Tạo log mới cho completed stage
                let newLog = {
                    stage: StageSerialStage.COMPLETED,
                    status: StatusSerialStage.PENDING_PACKAGING,
                    employee_id: employeeId,
                    started_at: new Date()
                };
                stageLogList.push(newLog);

                newStage = StageSerialStage.COMPLETED;

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
                    ...stageLog,
                    approved_by: employeeId,
                    completed_at: new Date()
                };
                stageLogList[stageLogList.length - 1] = stageLog;

                let newLog = {
                    stage: StageSerialStage.COMPLETED,
                    status: StatusSerialStage.COMPLETED,
                    employee_id: employeeId,
                    started_at: new Date()
                };
                stageLogList.push(newLog);
                
                sseController.sendProductionUpdate({
                    type: 'update_status',
                    device_serial: device_serial,
                    stage: stage,
                    status: StatusSerialStage.PENDING_PACKAGING,
                    stage_logs: stageLogList
                });
            }
        } else {
            return errorResponse(ErrorCodes.BAD_REQUEST, 'Giai đoạn được gửi không tồn tại!!');
        }

        // Cập nhật database
        await this.prisma.$transaction(async (tx) => {
            await tx.production_tracking.update({
                where: { production_id: production.production_id },
                data: { 
                    stage: newStage, 
                    status: stageLogList[stageLogList.length - 1].status,
                    state_logs: stageLogList 
                }
            });
        });

        return {
            success: true,
            errorCode: null,
            message: 'Cập nhật giai đoạn thành công'
        }
    }

    async CancelProductionSerial(input: ProductionTrackingCancelInput, employeeId: string) {
        const { device_serials, note } = input;

        const production_list = await this.prisma.production_tracking.findMany({
            where: { is_deleted: false, device_serial: { in: device_serials }, stage: StageSerialStage.PENDING },
            select: {
                production_id: true,
                device_serial: true,
                stage: true,
                status: true,
                state_logs: true
            }
        });

        if (device_serials.length !== production_list.length) {
            return errorResponse(ErrorCodes.PRODUCTION_NOT_FOUND, 'Production not found');
        }
        
        let error_list = [];
        await this.prisma.$transaction(async (tx) => {
            for (const production of production_list) {
                if (production.status !== StatusSerialStage.PENDING) {
                    error_list.push({
                        device_serial: production.device_serial,
                        error: 'Mã này không trong giai đoạn được yêu cầu huỷ'
                    });
                }
            }

            if (error_list.length > 0) {
                return errorResponse(ErrorCodes.BAD_REQUEST, 'Có sản phẩm không thể huỷ vì nằm ngoài giai đoạn', error_list);
            }

            await tx.production_tracking.updateMany({
                where: { production_id: { in: production_list.map(p => p.production_id) } },
                data: { status: StatusSerialStage.FAILED }
            });

            for (const production of production_list) {
                let stageLog = [
                    {
                        stage: StageSerialStage.PENDING,
                        status: StatusSerialStage.FAILED,
                        completed_at: new Date(),
                        employee_id: employeeId,
                        note: note
                    }
                ]

                sseController.sendProductionUpdate({
                    type: 'update_status',
                    device_serial: production.device_serial || '',
                    stage: StageSerialStage.PENDING,
                    status: StatusSerialStage.FAILED,
                    stage_logs: stageLog
                });
            }
        });

        return {
            success: true,
            errorCode: null,
            message: 'Huỷ sản phẩm thành công'
        }
    }
}