/**
 * Định nghĩa các route cho quản lý loại cảnh báo (Alert Type).
 * Sử dụng các middleware xác thực, phân quyền, kiểm tra dữ liệu đầu vào.
 *
 * Các endpoint:
 * - POST /: Tạo loại cảnh báo mới
 * - PUT /:alertTypeId: Cập nhật loại cảnh báo
 * - DELETE /:alertTypeId: Xoá loại cảnh báo
 * - GET /:alertTypeId: Lấy thông tin loại cảnh báo theo ID
 * - GET /: Lấy danh sách tất cả loại cảnh báo
 * @swagger
 * tags:
 *  name: Alert Type
 *  description: Quản lý các loại cảnh báo trong hệ thống
 */

import { Router, Request, Response, NextFunction } from "express";
import AlertTypeController from "../controllers/alert-type.controller";
import validateMiddleware from "../middleware/validate.middleware";
import authMiddleware from "../middleware/auth.middleware";
import roleMiddleware from "../middleware/role.middleware";
import {alertTypeIdSchema, alertTypeSchema, updateAlertTypeSchema} from "../utils/schemas/alert.schema";


const router = Router();
const alertTypeController = new AlertTypeController();

/**
 * Hàm wrapper cho các controller async để xử lý lỗi qua next().
 * @param fn Hàm controller async
 * @returns Middleware Express
 */
const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Tạo loại cảnh báo mới.
 * Yêu cầu xác thực, phân quyền và kiểm tra dữ liệu đầu vào.
 * @swagger
 * /api/alert-types:
 *   post:
 *     tags:
 *       - Alert Type
 *     summary: Tạo loại cảnh báo mới
 *     description: |
 *       Tạo một loại cảnh báo mới trong hệ thống.
 *       Yêu cầu xác thực bằng Employee Token (ADMIN/TECHNICIAN).
 *     security:
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin loại cảnh báo cần tạo
 *         schema:
 *           type: object
 *           required:
 *             - alert_type_name
 *           properties:
 *             alert_type_name:
 *               type: string
 *               description: Tên của loại cảnh báo (bắt buộc, tối đa 500 ký tự)
 *               example: Cảnh báo nhiệt độ cao
 *             priority:
 *               type: number
 *               description: Mức độ ưu tiên c���a loại cảnh báo (từ 1-5, mặc định là 1, càng cao càng quan trọng)
 *               example: 3
 *     responses:
 *       200:
 *         description: Tạo loại cảnh báo thành công
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
    validateMiddleware(alertTypeSchema),
    asyncHandler(alertTypeController.createAlertType)
);

/**
 * Cập nhật loại cảnh báo theo ID.
 * Yêu cầu xác thực, phân quyền và kiểm tra dữ liệu đầu vào.
 * @swagger
 * /api/alert-types/{alertTypeId}:
 *   put:
 *     tags:
 *       - Alert Type
 *     summary: Cập nhật loại cảnh báo
 *     description: Cập nhật thông tin cho một loại cảnh báo theo ID, yêu cầu quyền quản trị
 *     security:
 *       - Bearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: alertTypeId
 *         required: true
 *         type: string
 *         description: ID của loại cảnh báo cần thao tác
 *       - in: body
 *         name: body
 *         description: Thông tin cập nhật cho loại cảnh báo
 *         schema:
 *           type: object
 *           properties:
 *             alert_type_name:
 *               type: string
 *               description: Tên mới của loại cảnh báo (tối đa 500 ký tự)
 *               example: Cảnh báo nhiệt độ cao cập nhật
 *             priority:
 *               type: number
 *               description: Mức độ ưu tiên mới của loại cảnh báo (từ 1-5)
 *               example: 4
 *     responses:
 *       200:
 *         description: Cập nhật loại cảnh báo thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn (yêu cầu quyền admin)
 *       404:
 *         description: Không tìm thấy loại cảnh báo với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.put(
    "/:alertTypeId",
    authMiddleware,
    roleMiddleware,
    validateMiddleware(alertTypeIdSchema),
    validateMiddleware(updateAlertTypeSchema),
    asyncHandler(alertTypeController.updateAlertType)
);

/**
 * Xoá loại cảnh báo theo ID.
 * Yêu cầu xác thực, phân quyền và kiểm tra dữ liệu đầu vào.
 * @swagger
 * /api/alert-types/{alertTypeId}:
 *   delete:
 *     tags:
 *       - Alert Type
 *     summary: Xóa loại cảnh báo
 *     description: Xóa một loại cảnh báo theo ID, yêu cầu quyền quản trị
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: alertTypeId
 *         required: true
 *         type: string
 *         description: ID của loại cảnh báo cần xóa
 *     responses:
 *       200:
 *         description: Xóa loại cảnh báo thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn (yêu cầu quyền admin)
 *       404:
 *         description: Không tìm thấy loại cảnh báo với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.delete(
    "/:alertTypeId",
    authMiddleware,
    roleMiddleware,
    validateMiddleware(alertTypeIdSchema),
    asyncHandler(alertTypeController.deleteAlertType)
);

/**
 * Lấy thông tin loại cảnh báo theo ID.
 * Yêu cầu xác thực và kiểm tra dữ liệu đầu vào.
 * @swagger
 * /api/alert-types/{alertTypeId}:
 *   get:
 *     tags:
 *       - Alert Type
 *     summary: Lấy thông tin loại cảnh báo theo ID
 *     description: Lấy thông tin chi tiết của một loại cảnh báo theo ID
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: alertTypeId
 *         required: true
 *         type: string
 *         description: ID của loại cảnh báo cần xem
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết của loại cảnh báo
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy loại cảnh báo với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.get(
    "/:alertTypeId",
    authMiddleware,
    validateMiddleware(alertTypeIdSchema),
    asyncHandler(alertTypeController.getAlertTypeById)
);

/**
 * Lấy danh sách tất cả loại cảnh báo.
 * Yêu cầu xác thực.
 * @swagger
 * /api/alert-types:
 *   get:
 *     tags:
 *       - Alert Type
 *     summary: Lấy danh sách tất cả loại cảnh báo
 *     description: Lấy danh sách tất cả các loại cảnh báo trong hệ thống
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Trả về danh sách tất cả các loại cảnh báo
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get(
    "/",
    authMiddleware,
    asyncHandler(alertTypeController.getAllAlertTypes)
);

export default router;
