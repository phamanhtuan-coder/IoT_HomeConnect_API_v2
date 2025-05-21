/**
 * Định nghĩa các route cho quản lý cảnh báo (alert).
 * Sử dụng các middleware xác thực, phân quyền, và kiểm tra dữ liệu đầu vào.
 *
 * Các endpoint:
 * - POST /: Tạo cảnh báo mới
 * - PUT /:alertId: Cập nhật cảnh báo
 * - DELETE /:alertId/soft: Xóa mềm cảnh báo
 * - DELETE /:alertId/hard: Xóa cứng cảnh báo
 * - GET /:alertId: Lấy thông tin cảnh báo theo ID
 * - GET /: Lấy danh sách tất cả cảnh báo
 * @swagger
 * tags:
 *  name: Alert
 *  description: Quản lý các cảnh báo trong hệ thống
 */

import { Router, Request, Response, NextFunction } from "express";
import AlertController from "../controllers/alert.controller";
import validateMiddleware from "../middleware/validate.middleware";
import authMiddleware from "../middleware/auth.middleware";
import roleMiddleware from "../middleware/role.middleware";
import {alertIdSchema, alertSchema, updateAlertSchema} from "../utils/schemas/alert.schema";

const router = Router();
const alertController = new AlertController();

/**
 * Hàm helper để xử lý bất đồng bộ và bắt lỗi cho các controller.
 * @param fn Hàm controller bất đồng bộ
 * @returns Middleware Express xử lý lỗi
 */
const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Tạo cảnh báo mới.
 * @swagger
 * /api/alerts:
 *   post:
 *     tags:
 *       - Alert
 *     summary: Tạo cảnh báo mới
 *     description: |
 *       Tạo một cảnh báo mới trong hệ thống.
 *       Yêu cầu xác thực bằng Employee Token (ADMIN/TECHNICIAN).
 *     security:
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin cảnh báo cần tạo
 *         schema:
 *           type: object
 *           required:
 *             - alert_type_id
 *           properties:
 *             device_serial:
 *               type: string
 *               description: Số serial của thiết bị
 *             alert_type_id:
 *               type: string
 *               description: ID loại cảnh báo
 *     responses:
 *       201:
 *         description: Tạo cảnh báo thành công
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
    "/",
    authMiddleware,
    roleMiddleware,
    validateMiddleware(alertSchema),
    asyncHandler(alertController.createAlert)
);

/**
 * Cập nhật cảnh báo theo ID.
 * @swagger
 * /api/alerts/{alertId}:
 *   put:
 *     tags:
 *       - Alert
 *     summary: Cập nhật cảnh báo
 *     description: |
 *       Cập nhật thông tin cho một cảnh báo theo ID.
 *       Yêu cầu xác thực bằng Employee Token (ADMIN/TECHNICIAN).
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         type: string
 *         description: ID của cảnh báo cần cập nhật
 *       - in: body
 *         name: body
 *         description: Thông tin cập nhật cho cảnh báo
 *         schema:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               description: Nội dung thông báo cảnh báo cập nhật
 *               example: "Nhiệt độ đã trở lại bình thường"
 *             status:
 *               type: string
 *               enum: [unread, read]
 *               description: Trạng thái mới của cảnh báo
 *               example: "read"
 *     responses:
 *       200:
 *         description: Cập nhật cảnh báo thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không đủ quyền hạn (yêu cầu quyền ADMIN hoặc TECHNICIAN)
 *       404:
 *         description: Không tìm thấy cảnh báo với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.put(
    "/:alertId",
    authMiddleware,
    roleMiddleware,
    validateMiddleware(alertIdSchema),
    validateMiddleware(updateAlertSchema),
    asyncHandler(alertController.updateAlert)
);

/**
 * Xóa mềm cảnh báo theo ID.
 * @swagger
 * /api/alerts/{alertId}/soft:
 *   delete:
 *     tags:
 *       - Alert
 *     summary: Xóa mềm cảnh báo
 *     description: |
 *       Đánh dấu một cảnh báo là đã xóa nhưng vẫn giữ trong cơ sở dữ liệu.
 *       Yêu cầu xác thực bằng Employee Token (ADMIN/TECHNICIAN).
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         type: string
 *         description: ID của cảnh báo cần xóa mềm
 *     responses:
 *       200:
 *         description: Xóa mềm cảnh báo thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không đủ quyền hạn (yêu cầu quyền ADMIN hoặc TECHNICIAN)
 *       404:
 *         description: Không tìm thấy cảnh báo với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.delete(
    "/:alertId/soft",
    authMiddleware,
    roleMiddleware,
    validateMiddleware(alertIdSchema),
    asyncHandler(alertController.softDeleteAlert)
);

/**
 * Xóa cứng cảnh báo theo ID.
 * @swagger
 * /api/alerts/{alertId}/hard:
 *   delete:
 *     tags:
 *       - Alert
 *     summary: Xóa cứng cảnh báo
 *     description: |
 *       Xóa hoàn toàn một cảnh báo khỏi cơ sở dữ liệu.
 *       Yêu cầu xác thực bằng Employee Token (ADMIN/TECHNICIAN).
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         type: string
 *         description: ID của cảnh báo cần xóa cứng
 *     responses:
 *       200:
 *         description: Xóa cứng cảnh báo thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không đủ quyền hạn (yêu cầu quyền ADMIN hoặc TECHNICIAN)
 *       404:
 *         description: Không tìm thấy cảnh báo với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.delete(
    "/:alertId/hard",
    authMiddleware,
    roleMiddleware,
    validateMiddleware(alertIdSchema),
    asyncHandler(alertController.hardDeleteAlert)
);

/**
 * Lấy thông tin cảnh báo theo ID.
 * @swagger
 * /api/alerts/{alertId}:
 *   get:
 *     tags:
 *       - Alert
 *     summary: Lấy thông tin cảnh báo theo ID
 *     description: |
 *       Lấy thông tin chi tiết của một cảnh báo theo ID.
 *       Có thể xác thực bằng cả User Token và Employee Token.
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         type: string
 *         description: ID của cảnh báo cần xem
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết của cảnh báo
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: number
 *               description: ID của cảnh báo
 *             device_serial:
 *               type: string
 *               description: Số serial của thiết bị
 *             space_id:
 *               type: number
 *               description: ID của không gian
 *             message:
 *               type: string
 *               description: Nội dung cảnh báo
 *             status:
 *               type: string
 *               description: Trạng thái cảnh báo
 *             alert_type_id:
 *               type: number
 *               description: ID loại cảnh báo
 *             created_at:
 *               type: string
 *               format: date-time
 *               description: Thời gian tạo cảnh báo
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       404:
 *         description: Không tìm thấy cảnh báo với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.get(
    "/:alertId",
    authMiddleware,
    validateMiddleware(alertIdSchema),
    asyncHandler(alertController.getAlertById)
);

/**
 * Lấy danh sách tất cả cảnh báo.
 * @swagger
 * /api/alerts:
 *   get:
 *     tags:
 *       - Alert
 *     summary: Lấy danh sách tất cả cảnh báo
 *     description: |
 *       Lấy danh sách tất cả các cảnh báo trong hệ thống.
 *       Có thể xác thực bằng cả User Token và Employee Token.
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     responses:
 *       200:
 *         description: Trả về danh sách tất cả các cảnh báo
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: number
 *                 description: ID của cảnh báo
 *               device_serial:
 *                 type: string
 *                 description: Số serial của thiết bị
 *               space_id:
 *                 type: number
 *                 description: ID của không gian
 *               message:
 *                 type: string
 *                 description: Nội dung cảnh báo
 *               status:
 *                 type: string
 *                 description: Trạng thái cảnh báo
 *               alert_type_id:
 *                 type: number
 *                 description: ID loại cảnh báo
 *               created_at:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian tạo cảnh báo
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.get("/", authMiddleware, asyncHandler(alertController.getAllAlerts));

export default router;