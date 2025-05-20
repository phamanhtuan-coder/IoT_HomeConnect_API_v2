import { Router, Request, Response, NextFunction } from 'express';
import ShareRequestController from '../controllers/shareRequest.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import {approveShareRequestSchema, shareRequestSchema} from "../utils/schemas/sharing.schema";

/**
 * Định nghĩa router cho các API liên quan đến yêu cầu chia sẻ thiết bị.
 */
const router = Router();
const shareRequestController = new ShareRequestController();

/**
 * Hàm helper để xử lý các hàm async, tự động bắt lỗi và chuyển tới middleware xử lý lỗi.
 * @param fn Hàm async nhận vào req, res, next
 * @returns Middleware Express
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Tạo yêu cầu chia sẻ thiết bị cho một group.
 * Yêu cầu xác thực, kiểm tra vai trò group và validate dữ liệu đầu vào.
 */
router.post(
    '/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(shareRequestSchema),
    asyncHandler(shareRequestController.initiateShareRequest)
);

/**
 * Phê duyệt yêu cầu chia sẻ thiết bị.
 * Yêu cầu xác thực và validate dữ liệu đầu vào.
 */
router.post(
    '/approve/:requestId',
    authMiddleware,
    validateMiddleware(approveShareRequestSchema),
    asyncHandler(shareRequestController.approveShareRequest)
);

/**
 * Lấy danh sách yêu cầu chia sẻ theo thiết bị và group.
 * Yêu cầu xác thực và kiểm tra vai trò group.
 */
router.get(
    '/device/:deviceId/group/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(shareRequestController.getShareRequestsByDevice)
);

/**
 * Lấy danh sách quyền đã chia sẻ của thiết bị theo group.
 * Yêu cầu xác thực và kiểm tra vai trò group.
 */
router.get(
    '/permissions/device/:deviceId/group/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(shareRequestController.getSharedPermissionsByDevice)
);

/**
 * Lấy danh sách thiết bị đã chia sẻ bởi owner hiện tại.
 * Yêu cầu xác thực.
 */
router.get(
    '/owner',
    authMiddleware,
    asyncHandler(shareRequestController.getSharedDevicesByOwner)
);

export default router;