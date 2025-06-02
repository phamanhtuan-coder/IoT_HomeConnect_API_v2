import { z } from 'zod';

// Schema cho việc tạo firmware mới
export const firmwareSchema = z.object({
    body: z.object({
        version: z.string({
            required_error: 'Phiên bản firmware là bắt buộc',
            invalid_type_error: 'Phiên bản firmware phải là chuỗi'
        }),
        name: z.string({
            required_error: 'Tên firmware là bắt buộc',
            invalid_type_error: 'Tên firmware phải là chuỗi'
        }),
        file_path: z.string({
            required_error: 'Đường dẫn file là bắt buộc',
            invalid_type_error: 'Đường dẫn file phải là chuỗi'
        }),
        template_id: z.number({
            required_error: 'ID template là bắt buộc',
            invalid_type_error: 'ID template phải là số'
        }),
        is_mandatory: z.boolean().optional(),
        note: z.string().optional()
    })
});

// Schema cho việc cập nhật firmware
export const updateFirmwareSchema = z.object({
    params: z.object({
        firmwareId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'ID firmware phải là số dương')
    }),
    body: z.object({
        version: z.string({
            required_error: 'Phiên bản firmware là bắt buộc',
            invalid_type_error: 'Phiên bản firmware phải là chuỗi'
        }),
        name: z.string({
            required_error: 'Tên firmware là bắt buộc',
            invalid_type_error: 'Tên firmware phải là chuỗi'
        }),
        template_id: z.number({
            required_error: 'ID template là bắt buộc',
            invalid_type_error: 'ID template phải là số'
        }),
        is_mandatory: z.boolean({
            required_error: 'Trạng thái bắt buộc là bắt buộc',
            invalid_type_error: 'Trạng thái bắt buộc phải là boolean'
        }),
        note: z.string().optional()
    })
});

// Schema cho việc xác thực firmware ID
export const firmwareIdSchema = z.object({
    params: z.object({
        firmwareId: z.string()
            .transform((val) => parseInt(val))
            .refine((val) => val > 0, 'ID firmware phải là số dương')
    })
});

// Export các type từ schema
export type FirmwareInput = z.infer<typeof firmwareSchema>['body'];
export type UpdateFirmwareInput = z.infer<typeof updateFirmwareSchema>['body'];
export type FirmwareIdInput = z.infer<typeof firmwareIdSchema>['params'];