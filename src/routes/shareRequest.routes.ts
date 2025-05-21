import { Router, Request, Response, NextFunction } from 'express';
import ShareRequestController from '../controllers/shareRequest.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import {approveShareRequestSchema, shareRequestSchema} from "../utils/schemas/sharing.schema";

/**
 * Định nghĩa router cho các API liên quan đến yêu cầu chia sẻ thiết bị.
 * @swagger
 * tags:
 *  name: Share Request
 *  description: Quản lý các yêu cầu chia sẻ quyền truy cập thiết bị
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
 * @swagger
 * /api/share-requests/{groupId}:
 *   post:
 *     tags:
 *       - Share Request
 *     summary: Tạo yêu cầu chia sẻ thiết bị
 *     description: |
 *       Tạo một yêu cầu chia sẻ thiết bị cho một nhóm.
 *       Yêu cầu xác thực và quyền quản lý nhóm.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         type: string
 *         description: ID của nhóm được chia sẻ
 *       - in: body
 *         name: body
 *         description: Thông tin yêu cầu chia sẻ
 *         schema:
 *           type: object
 *           required:
 *             - device_id
 *             - permission_type
 *           properties:
 *             device_id:
 *               type: string
 *               description: ID của thiết bị cần chia sẻ
 *             permission_type:
 *               type: string
 *               enum: [VIEW, CONTROL]
 *               description: Loại quyền chia sẻ (xem hoặc điều khiển)
 *     responses:
 *       200:
 *         description: Tạo yêu cầu chia sẻ thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền quản lý nhóm
 *       500:
 *         description: Lỗi server
 */
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
 * @swagger
 * /api/share-requests/approve/{requestId}:
 *   post:
 *     tags:
 *       - Share Request
 *     summary: Phê duyệt yêu cầu chia sẻ
 *     description: Phê duyệt một yêu cầu chia sẻ thiết bị
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         type: string
 *         description: ID của yêu cầu chia sẻ
 *       - in: body
 *         name: body
 *         description: Thông tin phê duyệt
 *         schema:
 *           type: object
 *           required:
 *             - is_approved
 *           properties:
 *             is_approved:
 *               type: boolean
 *               description: Trạng thái phê duyệt (true/false)
 *     responses:
 *       200:
 *         description: Phê duyệt yêu cầu chia sẻ thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy yêu cầu chia sẻ
 *       500:
 *         description: Lỗi server
 */
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
 * @swagger
 * /api/share-requests/device/{deviceId}/group/{groupId}:
 *   get:
 *     tags:
 *       - Share Request
 *     summary: Lấy danh sách yêu cầu chia sẻ
 *     description: Lấy danh sách yêu cầu chia sẻ theo thiết bị và nhóm
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID của thiết bị
 *       - in: path
 *         name: groupId
 *         required: true
 *         type: string
 *         description: ID của nhóm
 *     responses:
 *       200:
 *         description: Trả về danh sách yêu cầu chia sẻ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền quản lý nhóm
 *       500:
 *         description: Lỗi server
 */
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
 * @swagger
 * /api/share-requests/permissions/device/{deviceId}/group/{groupId}:
 *   get:
 *     tags:
 *       - Share Request
 *     summary: Lấy danh sách quyền đã chia sẻ
 *     description: Lấy danh sách quyền đã chia sẻ của thiết bị theo nhóm
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID của thiết bị
 *       - in: path
 *         name: groupId
 *         required: true
 *         type: string
 *         description: ID của nhóm
 *     responses:
 *       200:
 *         description: Trả về danh sách quyền đã chia sẻ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền quản lý nhóm
 *       500:
 *         description: Lỗi server
 */
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
 * @swagger
 * /api/share-requests/owner:
 *   get:
 *     tags:
 *       - Share Request
 *     summary: Lấy danh sách thiết bị đã chia sẻ
 *     description: Lấy danh sách thiết bị đã chia sẻ bởi chủ sở hữu hiện tại
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Trả về danh sách thiết bị đã chia sẻ
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
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