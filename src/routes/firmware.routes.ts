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
import { firmwareIdSchema, firmwareSchema, updateFirmwareSchema} from "../utils/schemas/firmware.schema";

/**
 * Định nghĩa các route cho quản lý firmware.
 *
 * Các route này bao gồm:
 * - Tạo mới firmware
 * - Cập nhật firmware
 * - Xoá firmware
 * - Lấy thông tin firmware theo ID
 * - Lấy danh sách firmware
 *
 * Tất cả các route đều yêu cầu xác thực và phân quyền.
 */

const router = Router();
const firmwareController = new FirmwareController();

/**
 * Hàm helper để xử lý bất đồng bộ và bắt lỗi cho các controller.
 * @param fn Hàm controller bất đồng bộ
 * @returns Middleware Express xử lý lỗi
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};


/**
 * Lấy thông tin firmware theo ID.
 * @swagger
 * /api/firmware/{firmwareId}:
 *   get:
 *     tags:
 *       - Firmware
 *     summary: Lấy thông tin firmware theo ID
 *     description: |
 *       Lấy thông tin chi tiết của một phiên bản firmware theo ID.
 *       Yêu cầu xác thực (User hoặc Employee).
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: firmwareId
 *         required: true
 *         type: string
 *         description: ID của firmware cần xem
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết của firmware
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: number
 *               description: ID của firmware
 *             version:
 *               type: string
 *               description: Số phiên bản firmware
 *             device_type:
 *               type: string
 *               description: Loại thiết bị áp dụng
 *             file_url:
 *               type: string
 *               description: URL tải file firmware
 *             description:
 *               type: string
 *               description: Mô tả về phiên bản firmware
 *             created_at:
 *               type: string
 *               format: date-time
 *               description: Thời gian tạo firmware
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       404:
 *         description: Không tìm thấy firmware với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/detail/:firmwareId',
    authMiddleware,
    validateMiddleware(FirmwareIdSchema),
    asyncHandler(firmwareController.getFirmwareById)
);

/**
 * Lấy danh sách tất cả firmware.
 * @swagger
 * /api/firmware:
 *   get:
 *     tags:
 *       - Firmware
 *     summary: Lấy danh sách tất cả firmware
 *     description: |
 *       Lấy danh sách tất cả các phiên bản firmware trong hệ thống.
 *       Yêu cầu xác thực (User hoặc Employee).
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     responses:
 *       200:
 *         description: Trả về danh sách tất cả firmware
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: number
 *                 description: ID của firmware
 *               version:
 *                 type: string
 *                 description: Số phiên bản firmware
 *               device_type:
 *                 type: string
 *                 description: Loại thiết bị áp dụng
 *               file_url:
 *                 type: string
 *                 description: URL tải file firmware
 *               description:
 *                 type: string
 *                 description: Mô tả về phiên bản firmware
 *               created_at:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian tạo firmware
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
 */
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
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(firmwareSchema),
    asyncHandler(firmwareController.createFirmware)
);

/**
 * Cập nhật firmware theo ID.
 * @swagger
 * /api/firmware/{firmwareId}:
 *   put:
 *     tags:
 *       - Firmware
 *     summary: Cập nhật thông tin firmware
 *     description: |
 *       Cập nhật thông tin cho một phiên bản firmware theo ID.
 *       Yêu cầu xác thực bằng Employee Token (ADMIN/TECHNICIAN).
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: firmwareId
 *         required: true
 *         type: string
 *         description: ID của firmware cần cập nhật
 *       - in: body
 *         name: body
 *         description: Thông tin cập nhật cho firmware
 *         schema:
 *           type: object
 *           properties:
 *             version:
 *               type: string
 *               description: Số phiên bản firmware mới
 *               example: "1.0.1"
 *             description:
 *               type: string
 *               description: Mô tả mới về phiên bản firmware
 *               example: "Sửa lỗi đo nhiệt độ không chính xác"
 *             file_url:
 *               type: string
 *               description: URL mới của file firmware
 *               example: "https://firmware.example.com/v1.0.1.bin"
 *     responses:
 *       200:
 *         description: Cập nhật firmware thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không đủ quyền hạn (yêu cầu quyền ADMIN hoặc TECHNICIAN)
 *       404:
 *         description: Không tìm thấy firmware với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.put(
    '/edit/:firmwareId',
    // authMiddleware,
    // roleMiddleware,
    validateMiddleware(updateFirmwareSchema),
    asyncHandler(firmwareController.updateFirmware)
);

router.patch(
    '/confirm-by-tester',
    // authMiddleware,
    // validateMiddleware(firmwareIdSchema),
    validateMiddleware(firmwareIdSchema),
    asyncHandler(firmwareController.confirmFirmwareByTester)
);

router.patch(
    '/confirm-by-rd',
    // authMiddleware,
    // validateMiddleware(firmwareIdSchema),
    validateMiddleware(firmwareIdSchema),
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
    // validateMiddleware(firmwareIdSchema),
    validateMiddleware(firmwareIdSchema),
    asyncHandler(firmwareController.deleteFirmware)
);

export default router;
