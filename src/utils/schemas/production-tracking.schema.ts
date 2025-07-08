import { z } from 'zod';
import { RejectReason, StageSerialStage, StatusSerialStage } from '../../types/production-tracking';
import { ERROR_CODES, ERROR_MESSAGES } from '../../contants/error';

// Schema cơ bản cho danh sách serial
const SerialListSchema = z.object({
    device_serials: z.array(z.string(), {
        required_error: `[${ERROR_CODES.PRODUCTION_TRACKING_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_SERIAL_REQUIRED]}`,
        invalid_type_error: `[${ERROR_CODES.PRODUCTION_TRACKING_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_SERIAL_INVALID]}`
    }).min(1, `[${ERROR_CODES.PRODUCTION_TRACKING_SERIAL_LIST_EMPTY}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_SERIAL_LIST_EMPTY]}`)
});

// Schema cho việc xác nhận sản phẩm đã được kiểm tra
export const ApproveProductionSchema = z.object({
    body: SerialListSchema
});

// Schema cho việc từ chối sản phẩm QC
export const RejectProductionSchema = z.object({
    body: SerialListSchema.extend({
        reason: z.enum([RejectReason.BLUR_ERROR, RejectReason.PRODUCT_ERROR, RejectReason.ALL_ERROR], {
            required_error: `[${ERROR_CODES.PRODUCTION_TRACKING_REASON_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_REASON_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.PRODUCTION_TRACKING_REASON_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_REASON_INVALID]}`
        }),
        note: z.string().optional()
    })
});

// Schema cho việc cập nhật trạng thái sản phẩm
export const UpdateProductionSchema = z.object({
    body: z.object({
        serial_number: z.string({
            required_error: `[${ERROR_CODES.PRODUCTION_TRACKING_SERIAL_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_SERIAL_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.PRODUCTION_TRACKING_SERIAL_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_SERIAL_INVALID]}`
        }),
        stage: z.enum([
            StageSerialStage.PENDING,
            StageSerialStage.ASSEMBLY,
            StageSerialStage.QC,
            StageSerialStage.COMPLETED,
        ], {
            required_error: `[${ERROR_CODES.PRODUCTION_TRACKING_STAGE_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_STAGE_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.PRODUCTION_TRACKING_STAGE_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_STAGE_INVALID]}`
        }),
        status: z.enum([
            StatusSerialStage.PENDING,
            StatusSerialStage.IN_PROGRESS,
            StatusSerialStage.FIRMWARE_UPLOAD,
            StatusSerialStage.FIRMWARE_UPLOADING,
            StatusSerialStage.FIRMWARE_UPLOADED,
            StatusSerialStage.FIRMWARE_FAILED,
            StatusSerialStage.TESTING,
            StatusSerialStage.PENDING_PACKAGING,
            StatusSerialStage.COMPLETED,
            StatusSerialStage.FIXING_LABEL,
            StatusSerialStage.FIXING_PRODUCT,
            StatusSerialStage.FIXING_ALL,
            StatusSerialStage.FAILED,
            StatusSerialStage.COMPLETED_PACKAGING
        ], {
            required_error: `[${ERROR_CODES.PRODUCTION_TRACKING_STATUS_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_STATUS_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.PRODUCTION_TRACKING_STATUS_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_STATUS_INVALID]}`
        })
    })
});

// Schema cho việc huỷ sản phẩm
export const CancelProductionSchema = z.object({
    body: SerialListSchema.extend({
        note: z.string().optional()
    })
});

// Schema cho việc duyệt sản phẩm đã kiểm thử
export const ApproveTestedSchema = z.object({
    body: SerialListSchema.extend({
        note: z.string().optional()
    })
});

// Schema cho việc lấy danh sách serial cần cài firmware
export const GetSerialFirmwareSchema = z.object({
    query: z.object({
        type: z.enum(['planning', 'batch', 'tracking'], {
            required_error: `[${ERROR_CODES.PRODUCTION_TRACKING_QUERY_TYPE_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_QUERY_TYPE_REQUIRED]}`,
            invalid_type_error: `[${ERROR_CODES.PRODUCTION_TRACKING_QUERY_TYPE_INVALID}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_QUERY_TYPE_INVALID]}`
        }),
        planning_id: z.string().optional(),
        batch_id: z.string().optional()
    }).refine(
        (data) => {
            if (data.type === 'batch' && !data.planning_id) {
                return false;
            }
            if (data.type === 'tracking' && !data.batch_id) {
                return false;
            }
            return true;
        },
        {
            message: `[${ERROR_CODES.PRODUCTION_TRACKING_PLANNING_ID_REQUIRED}]${ERROR_MESSAGES[ERROR_CODES.PRODUCTION_TRACKING_PLANNING_ID_REQUIRED]}`
        }
    )
});


// Export các type từ schema
export type ApproveProductionInput = z.infer<typeof ApproveProductionSchema>['body'];
export type RejectProductionInput = z.infer<typeof RejectProductionSchema>['body'];
export type UpdateProductionInput = z.infer<typeof UpdateProductionSchema>['body'];
export type CancelProductionInput = z.infer<typeof CancelProductionSchema>['body'];
export type ApproveTestedInput = z.infer<typeof ApproveTestedSchema>['body'];
export type GetSerialFirmwareInput = z.infer<typeof GetSerialFirmwareSchema>['query'];