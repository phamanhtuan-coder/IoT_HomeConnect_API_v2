import { Router, Request, Response, NextFunction } from 'express';
import FirmwareUpdateHistoryController from '../controllers/firmware-update-history.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import {
    // FirmwareUpdateHistoryFilterSchema,
    // FirmwareUpdateHistoryIdSchema,
    // FirmwareUpdateHistorySchema,
    // UpdateFirmwareUpdateHistorySchema
} from "../utils/schemas/firmware.schema";

/**
 * Định nghĩa các route cho lịch sử cập nhật firmware.
 * @swagger
 * tags:
 *  name: Firmware Update History
 *  description: Quản lý lịch sử cập nhật firmware của thiết bị
 */

const router = Router();
const firmwareUpdateHistoryController = new FirmwareUpdateHistoryController();

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
 * Tạo mới lịch sử cập nhật firmware.
 * @swagger
 * /api/firmware-update-history:
 *   post:
 *     tags:
 *       - Firmware Update History
 *     summary: Tạo bản ghi lịch sử cập nhật firmware
 *     description: |
 *       T��o một bản ghi mới về việc cập nhật firmware cho thiết bị.
 *       Yêu cầu xác thực bằng Employee Token (ADMIN/TECHNICIAN).
 *     security:
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin lịch sử cập nhật firmware
 *         schema:
 *           type: object
 *           required:
 *             - device_serial
 *             - firmware_id
 *             - status
 *           properties:
 *             device_serial:
 *               type: string
 *               description: Số serial của thiết bị được cập nhật (bắt buộc)
 *               example: "ABC123"
 *             firmware_id:
 *               type: number
 *               description: ID của phiên bản firmware được cập nhật (bắt buộc)
 *               example: 1
 *             status:
 *               type: string
 *               enum: [pending, success, failed]
 *               description: Trạng thái của quá trình cập nhật (bắt buộc)
 *               example: "pending"
 *             note:
 *               type: string
 *               description: Ghi chú về việc cập nhật
 *               example: "Cập nhật theo yêu cầu của khách hàng"
 *     responses:
 *       201:
 *         description: Tạo bản ghi lịch sử thành công
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
    roleMiddleware,
    // validateMiddleware(FirmwareUpdateHistorySchema),
    asyncHandler(firmwareUpdateHistoryController.createFirmwareUpdateHistory)
);

/**
 * Cập nhật lịch sử cập nhật firmware.
 * @swagger
 * /api/firmware-update-history/{updateId}:
 *   put:
 *     tags:
 *       - Firmware Update History
 *     summary: Cập nhật thông tin lịch sử cập nhật firmware
 *     description: |
 *       Cập nhật thông tin của một bản ghi lịch sử cập nhật firmware.
 *       Yêu cầu xác thực bằng Employee Token (ADMIN/TECHNICIAN).
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: updateId
 *         required: true
 *         type: string
 *         description: ID của bản ghi lịch sử cần cập nhật
 *       - in: body
 *         name: body
 *         description: Thông tin cập nhật cho bản ghi lịch sử
 *         schema:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [pending, success, failed]
 *               description: Trạng thái mới của quá trình cập nhật
 *               example: "success"
 *             note:
 *               type: string
 *               description: Ghi chú mới về việc cập nhật
 *               example: "Cập nhật thành công, thiết bị hoạt động bình thường"
 *     responses:
 *       200:
 *         description: Cập nhật bản ghi lịch sử thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không đủ quyền hạn (yêu cầu quyền ADMIN hoặc TECHNICIAN)
 *       404:
 *         description: Không tìm thấy bản ghi lịch sử với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.put(
    '/:updateId',
    authMiddleware,
    roleMiddleware,
    // validateMiddleware(UpdateFirmwareUpdateHistorySchema),
    asyncHandler(firmwareUpdateHistoryController.updateFirmwareUpdateHistory)
);

/**
 * Xoá lịch sử cập nhật firmware.
 * @swagger
 * /api/firmware-update-history/{updateId}:
 *   delete:
 *     tags:
 *       - Firmware Update History
 *     summary: Xóa bản ghi lịch sử cập nhật firmware
 *     description: |
 *       Xóa một bản ghi lịch sử cập nhật firmware khỏi hệ thống.
 *       Yêu cầu xác thực bằng Employee Token (ADMIN/TECHNICIAN).
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: updateId
 *         required: true
 *         type: string
 *         description: ID của bản ghi lịch sử cần xóa
 *     responses:
 *       200:
 *         description: Xóa bản ghi lịch sử thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không đủ quyền hạn (yêu cầu quyền ADMIN hoặc TECHNICIAN)
 *       404:
 *         description: Không tìm thấy bản ghi lịch sử với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.delete(
    '/:updateId',
    authMiddleware,
    roleMiddleware,
    // validateMiddleware(FirmwareUpdateHistoryIdSchema),
    asyncHandler(firmwareUpdateHistoryController.deleteFirmwareUpdateHistory)
);

/**
 * Lấy thông tin lịch sử cập nhật firmware theo ID.
 * @swagger
 * /api/firmware-update-history/{updateId}:
 *   get:
 *     tags:
 *       - Firmware Update History
 *     summary: Lấy thông tin chi tiết bản ghi lịch sử
 *     description: |
 *       Lấy thông tin chi tiết của một bản ghi lịch sử cập nhật firmware.
 *       Yêu cầu xác thực (User hoặc Employee).
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: updateId
 *         required: true
 *         type: string
 *         description: ID của bản ghi lịch sử cần xem
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết của bản ghi lịch sử
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: number
 *               description: ID của bản ghi lịch sử
 *             device_serial:
 *               type: string
 *               description: Số serial của thiết bị được cập nhật
 *             firmware_id:
 *               type: number
 *               description: ID của phiên bản firmware
 *             status:
 *               type: string
 *               description: Trạng thái của quá trình cập nhật
 *             note:
 *               type: string
 *               description: Ghi chú về việc cập nhật
 *             created_at:
 *               type: string
 *               format: date-time
 *               description: Thời gian tạo bản ghi
 *             updated_at:
 *               type: string
 *               format: date-time
 *               description: Thời gian cập nhật gần nhất
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       404:
 *         description: Không tìm thấy bản ghi lịch sử với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/:updateId',
    authMiddleware,
    // validateMiddleware(FirmwareUpdateHistoryIdSchema),
    asyncHandler(firmwareUpdateHistoryController.getFirmwareUpdateHistoryById)
);

/**
 * Lấy danh sách lịch sử cập nhật firmware với bộ lọc.
 * @swagger
 * /api/firmware-update-history:
 *   get:
 *     tags:
 *       - Firmware Update History
 *     summary: Lấy danh sách lịch sử cập nhật firmware
 *     description: |
 *       Lấy danh sách các bản ghi lịch sử cập nhật firmware với bộ lọc.
 *       Yêu cầu xác thực (User hoặc Employee).
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: query
 *         name: device_serial
 *         type: string
 *         description: Lọc theo số serial thiết bị
 *       - in: query
 *         name: firmware_id
 *         type: number
 *         description: Lọc theo ID firmware
 *       - in: query
 *         name: status
 *         type: string
 *         description: Lọc theo trạng thái cập nhật
 *         enum: [pending, success, failed]
 *       - in: query
 *         name: from_date
 *         type: string
 *         format: date
 *         description: Lọc từ ngày (YYYY-MM-DD)
 *       - in: query
 *         name: to_date
 *         type: string
 *         format: date
 *         description: Lọc đến ngày (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Trả về danh sách các bản ghi lịch sử
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: number
 *                 description: ID của bản ghi lịch sử
 *               device_serial:
 *                 type: string
 *                 description: Số serial của thiết bị được cập nhật
 *               firmware_id:
 *                 type: number
 *                 description: ID của phiên bản firmware
 *               status:
 *                 type: string
 *                 description: Trạng thái của quá trình cập nhật
 *               note:
 *                 type: string
 *                 description: Ghi chú về việc cập nhật
 *               created_at:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian tạo bản ghi
 *               updated_at:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian cập nhật gần nhất
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/',
    authMiddleware,
    // validateMiddleware(FirmwareUpdateHistoryFilterSchema),
    asyncHandler(firmwareUpdateHistoryController.getFirmwareUpdateHistories)
);

export default router;
