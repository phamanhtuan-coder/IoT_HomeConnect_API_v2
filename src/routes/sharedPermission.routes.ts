import { Router, Request, Response, NextFunction } from 'express';
import SharedPermissionController from '../controllers/sharedPermission.controller';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';

/**
 * Router cho các API liên quan đến chia sẻ quyền truy cập thiết bị.
 */
const router = Router();

/**
 * Controller xử lý logic chia sẻ quyền truy cập thiết bị.
 */
const sharedPermissionController = new SharedPermissionController();

/**
 * Hàm helper để xử lý các middleware bất đồng bộ và bắt lỗi.
 * @param fn Hàm middleware bất đồng bộ
 * @returns Middleware Express xử lý lỗi bất đồng bộ
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * API xoá quyền chia sẻ thiết bị theo permissionId.
 * Yêu cầu xác thực và kiểm tra vai trò nhóm.
 */
router.delete(
    '/:permissionId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(sharedPermissionController.revokeShareDevice)
);

/**
 * API xoá quyền chia sẻ thiết bị theo permissionId dành cho recipient.
 * Yêu cầu xác thực.
 */
router.delete(
    '/recipient/:permissionId',
    authMiddleware,
    asyncHandler(sharedPermissionController.revokeShareByRecipient)
);

export default router;