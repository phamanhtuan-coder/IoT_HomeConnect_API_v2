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
 */

import { Router, Request, Response, NextFunction } from "express";
import AlertController from "../controllers/alert.controller";
import validateMiddleware from "../middleware/validate.middleware";
import authMiddleware from "../middleware/auth.middleware";
import roleMiddleware from "../middleware/role.middleware";
import { alertSchema, updateAlertSchema, alertIdSchema } from "../utils/validators";

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
 * Yêu cầu xác thực, phân quyền và kiểm tra dữ liệu đầu vào.
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
 * Yêu cầu xác thực, phân quyền và kiểm tra dữ liệu đầu vào.
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
 * Yêu cầu xác thực, phân quyền và kiểm tra dữ liệu đầu vào.
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
 * Yêu cầu xác thực, phân quyền và kiểm tra dữ liệu đầu vào.
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
 * Yêu cầu xác thực và kiểm tra dữ liệu đầu vào.
 */
router.get(
    "/:alertId",
    authMiddleware,
    validateMiddleware(alertIdSchema),
    asyncHandler(alertController.getAlertById)
);

/**
 * Lấy danh sách tất cả cảnh báo.
 * Yêu cầu xác thực.
 */
router.get("/", authMiddleware, asyncHandler(alertController.getAllAlerts));

export default router;