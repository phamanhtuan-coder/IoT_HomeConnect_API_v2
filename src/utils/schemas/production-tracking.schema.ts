import { z } from 'zod';

// Schema cho việc duyệt sản phẩm
export const approveProductionSchema = z.object({
    body: z.object({
        device_serials: z.array(z.string(), {
            required_error: 'Danh sách serial là bắt buộc',
            invalid_type_error: 'Danh sách serial phải là một mảng các chuỗi'
        }).min(1, 'Danh sách serial không được để trống')
    })
});

// Schema cho việc từ chối sản phẩm QC
export const rejectProductionSchema = z.object({
    body: z.object({
        device_serials: z.array(z.string(), {
            required_error: 'Danh sách serial là bắt buộc',
            invalid_type_error: 'Danh sách serial phải là một mảng các chuỗi'
        }).min(1, 'Danh sách serial không được để trống'),
        reason: z.enum(['BLUR_ERROR', 'PRODUCT_ERROR', 'OTHER'], {
            required_error: 'Lý do từ chối là bắt buộc',
            invalid_type_error: 'Lý do từ chối không hợp lệ'
        }),
        note: z.string().optional()
    })
});

// Schema cho việc cập nhật trạng thái sản phẩm
export const updateProductionSchema = z.object({
    body: z.object({
        device_serial: z.string({
            required_error: 'Mã serial là bắt buộc',
            invalid_type_error: 'Mã serial phải là chuỗi'
        }),
        stage: z.enum(['PENDING', 'ASSEMBLY', 'FIRMWARE_UPLOAD', 'QC', 'COMPLETED'], {
            required_error: 'Giai đoạn là bắt buộc',
            invalid_type_error: 'Giai đoạn không hợp lệ'
        }),
        status: z.enum([
            'PENDING',
            'IN_PROGRESS',
            'FIRMWARE_UPLOAD',
            'FIRMWARE_UPLOADING',
            'FIRMWARE_UPLOADED',
            'FIRMWARE_FAILED',
            'TESTING',
            'PENDING_PACKAGING',
            'COMPLETED',
            'FIXING_LABEL',
            'FIXING_PRODUCT',
            'FIXING_ALL',
            'FAILED'
        ], {
            required_error: 'Trạng thái là bắt buộc',
            invalid_type_error: 'Trạng thái không hợp lệ'
        })
    })
});

// Schema cho việc huỷ sản phẩm
export const cancelProductionSchema = z.object({
    body: z.object({
        device_serials: z.array(z.string(), {
            required_error: 'Danh sách serial là bắt buộc',
            invalid_type_error: 'Danh sách serial phải là một mảng các chuỗi'
        }).min(1, 'Danh sách serial không được để trống'),
        note: z.string().optional()
    })
});

// Schema cho việc duyệt sản phẩm đã kiểm thử
export const approveTestedSchema = z.object({
    body: z.object({
        device_serials: z.array(z.string(), {
            required_error: 'Danh sách serial là bắt buộc',
            invalid_type_error: 'Danh sách serial phải là một mảng các chuỗi'
        }).min(1, 'Danh sách serial không được để trống'),
        note: z.string().optional()
    })
});

// Schema cho việc lấy danh sách serial cần cài firmware
export const getSerialFirmwareSchema = z.object({
    query: z.object({
        type: z.enum(['planning', 'batch', 'tracking'], {
            required_error: 'Loại truy vấn là bắt buộc',
            invalid_type_error: 'Loại truy vấn không hợp lệ'
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
            message: 'Tham số không phù hợp với loại truy vấn'
        }
    )
});



// Export các type từ schema
export type ApproveProductionInput = z.infer<typeof approveProductionSchema>['body'];
export type RejectProductionInput = z.infer<typeof rejectProductionSchema>['body'];
export type UpdateProductionInput = z.infer<typeof updateProductionSchema>['body'];
export type CancelProductionInput = z.infer<typeof cancelProductionSchema>['body'];
export type ApproveTestedInput = z.infer<typeof approveTestedSchema>['body'];
export type GetSerialFirmwareInput = z.infer<typeof getSerialFirmwareSchema>['query'];