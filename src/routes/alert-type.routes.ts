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
 */
router.get(
    "/",
    authMiddleware,
    asyncHandler(alertTypeController.getAllAlertTypes)
);

export default router;