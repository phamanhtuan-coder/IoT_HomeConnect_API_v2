/**
 * Định nghĩa các route cho quản lý firmware.
 * @swagger
 * tags:
 *  name: Firmware
 *  description: Quản lý các phiên bản firmware của thiết bị
 */

import { Router, Request, Response, NextFunction } from 'express';
import FirmwareController from '../controllers/firmware.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import { FirmwareIdSchema, FirmwareCreateSchema, FirmwareUpdateSchema} from "../utils/schemas/firmware.schema";

const router = Router();
const firmwareController = new FirmwareController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};


router.get(
    '/detail/:firmwareId',
    // authMiddleware,
    validateMiddleware(FirmwareIdSchema),
    asyncHandler(firmwareController.getFirmwareById)
);

router.get(
    '/',
    // authMiddleware,
    asyncHandler(firmwareController.getFirmwares)
);

router.get(
    '/latest-version-by-template',
    // authMiddleware,
    asyncHandler(firmwareController.getLatestVersionFirmwaresByTemplate)
);

router.get(
    '/by-template/:templateId',
    // authMiddleware,
    asyncHandler(firmwareController.getFirmwaresByTemplateId)
);

/**
 * Tạo mới firmware.
 * @swagger
 * /api/firmware:
 *   post:
 *     tags:
 *       - Firmware
 *     summary: Tạo phiên bản firmware mới
 *     description: |
 *       Tạo một phiên bản firmware mới trong hệ thống.
 *       Yêu cầu xác thực bằng Employee Token (ADMIN/TECHNICIAN).
 *     security:
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin firmware cần tạo
 *         schema:
 *           type: object
 *           required:
 *             - version
 *             - device_type
 *             - file_url
 *           properties:
 *             version:
 *               type: string
 *               description: Số phiên bản firmware (bắt buộc)
 *               example: "1.0.0"
 *             device_type:
 *               type: string
 *               description: Loại thiết bị áp dụng (bắt buộc)
 *               example: "TEMPERATURE_SENSOR"
 *             file_url:
 *               type: string
 *               description: URL tải file firmware (bắt buộc)
 *               example: "https://firmware.example.com/v1.0.0.bin"
 *             description:
 *               type: string
 *               description: Mô tả về phiên bản firmware
 *               example: "Cập nhật tính năng đo nhiệt độ chính xác hơn"
 *     responses:
 *       201:
 *         description: Tạo firmware thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không đủ quyền hạn (yêu cầu quyền ADMIN hoặc TECHNICIAN)
 *       500:
 *         description: Lỗi server
 */

router.post(
    '/',
    // authMiddleware,
    // roleMiddleware,
    validateMiddleware(FirmwareCreateSchema),
    asyncHandler(firmwareController.createFirmware)
);

router.put(
    '/edit/:firmwareId',
    // authMiddleware,
    // roleMiddleware,
    validateMiddleware(FirmwareUpdateSchema),
    asyncHandler(firmwareController.updateFirmware)
);

router.patch(
    '/confirm-by-tester',
    // authMiddleware,
    validateMiddleware(FirmwareIdSchema),
    asyncHandler(firmwareController.confirmFirmwareByTester)
);

router.patch(
    '/confirm-by-rd',
    // authMiddleware,
    validateMiddleware(FirmwareIdSchema),
    asyncHandler(firmwareController.confirmFirmwareByRD)
);

/**
 * Xoá firmware theo ID.
 * @swagger
 * /api/firmware/{firmwareId}:
 *   delete:
 *     tags:
 *       - Firmware
 *     summary: Xóa firmware
 *     description: |
 *       Xóa một phiên bản firmware khỏi hệ thống.
 *       Yêu cầu xác thực bằng Employee Token (ADMIN/TECHNICIAN).
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: firmwareId
 *         required: true
 *         type: string
 *         description: ID của firmware cần xóa
 *     responses:
 *       200:
 *         description: Xóa firmware thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không đủ quyền hạn (yêu cầu quyền ADMIN hoặc TECHNICIAN)
 *       404:
 *         description: Không tìm thấy firmware với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.delete(
    '/:firmwareId',
    // authMiddleware,
    // roleMiddleware,
    validateMiddleware(FirmwareIdSchema),
    asyncHandler(firmwareController.deleteFirmware)
);

export default router;
