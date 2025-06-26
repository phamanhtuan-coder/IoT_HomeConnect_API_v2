import { Router, Request, Response, NextFunction } from 'express';
import SharedPermissionController from '../controllers/sharedPermission.controller';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';

/**
 * Router cho các API liên quan đến chia sẻ quyền truy cập thiết bị.
 * @swagger
 * tags:
 *  name: Shared Permission
 *  description: Quản lý quyền truy cập được chia sẻ cho thiết bị
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
 * @swagger
 * /api/shared-permissions/{permissionId}:
 *   delete:
 *     tags:
 *       - Shared Permission
 *     summary: Xóa quyền chia sẻ thiết bị
 *     description: |
 *       Xóa quyền chia sẻ thiết bị theo ID quyền.
 *       Yêu cầu xác thực và quyền quản lý nhóm.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: permissionId
 *         required: true
 *         type: string
 *         description: ID của quyền chia sẻ cần xóa
 *     responses:
 *       200:
 *         description: Xóa quyền chia sẻ thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền quản lý nhóm
 *       404:
 *         description: Không tìm thấy quyền chia sẻ
 *       500:
 *         description: Lỗi server
 */
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
 * @swagger
 * /api/shared-permissions/recipient/{permissionId}:
 *   delete:
 *     tags:
 *       - Shared Permission
 *     summary: Từ chối quyền chia sẻ thiết bị (dành cho người nhận)
 *     description: |
 *       Cho phép người nhận quyền từ chối/hủy quyền chia sẻ thiết bị đã được cấp.
 *       Yêu cầu xác thực và phải là người nhận quyền.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: permissionId
 *         required: true
 *         type: string
 *         description: ID của quyền chia sẻ cần từ chối
 *     responses:
 *       200:
 *         description: Từ chối quyền chia sẻ thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không phải là người nhận quyền
 *       404:
 *         description: Không tìm thấy quyền chia sẻ
 *       500:
 *         description: Lỗi server
 */
/**
 * API xoá quyền chia sẻ thiết bị theo permissionId dành cho recipient.
 * Yêu cầu xác thực.
 */
router.delete(
    '/recipient/:permissionId',
    authMiddleware,
    asyncHandler(sharedPermissionController.revokeShareByRecipient)
);

router.get(
    '/get-device-shared-for-customer',
    authMiddleware,
    asyncHandler(sharedPermissionController.getDeviceSharedForCustomer)
);

export default router;