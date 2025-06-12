/**
 * Định nghĩa các route quản lý thiết bị của người dùng.
 * @swagger
 * tags:
 *  name: User Device
 *  description: Quản lý thiết bị của người dùng trong hệ thống
 */

import express, { Request, Response, NextFunction } from 'express';
import { UserDeviceController } from '../controllers/user-device.controller';
import authMiddleware from '../middleware/auth.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import {deviceIdForRevokeSchema, userDeviceIdSchema} from "../utils/schemas/device.schema";

const router = express.Router();
const userDeviceController = new UserDeviceController();

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
 * @swagger
 * /api/user-devices/me:
 *   get:
 *     tags:
 *       - User Device
 *     summary: Lấy danh sách thiết bị của người dùng hiện tại
 *     description: Lấy danh sách tất cả thiết bị thuộc về người dùng đang đăng nhập
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Trả về danh sách thiết bị
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: ID của thiết bị
 *               device_serial:
 *                 type: string
 *                 description: Serial của thiết bị
 *               user_id:
 *                 type: string
 *                 description: ID của người dùng sở hữu
 *               device_name:
 *                 type: string
 *                 description: Tên của thiết bị
 *               created_at:
 *                 type: string
 *                 format: date-time
 *                 description: Thời điểm thiết bị được thêm
 *               updated_at:
 *                 type: string
 *                 format: date-time
 *                 description: Thời điểm cập nhật gần nh��t
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/me', 
    authMiddleware, 
    asyncHandler(userDeviceController.getOwnDevices)
); // User's own devices

/**
 * @swagger
 * /api/user-devices/{userId}:
 *   get:
 *     tags:
 *       - User Device
 *     summary: Lấy danh sách thiết bị của người dùng cụ th��
 *     description: |
 *       Quản trị viên có thể xem danh sách thiết bị của một người dùng cụ thể.
 *       Yêu cầu quyền quản trị.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         type: string
 *         description: ID của người dùng cần xem thiết bị
 *     responses:
 *       200:
 *         description: Trả về danh sách thiết bị
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *               device_serial:
 *                 type: string
 *               user_id:
 *                 type: string
 *               device_name:
 *                 type: string
 *               created_at:
 *                 type: string
 *                 format: date-time
 *               updated_at:
 *                 type: string
 *                 format: date-time
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền admin
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/:userId',
    authMiddleware,
    validateMiddleware(userDeviceIdSchema),
    asyncHandler(userDeviceController.getUserDevices)
); // Admin: any user's devices

/**
 * @swagger
 * /api/user-devices/{deviceId}:
 *   delete:
 *     tags:
 *       - User Device
 *     summary: Thu hồi thiết bị
 *     description: |
 *       Thu hồi thiết bị khỏi người dùng.
 *       Yêu cầu quyền quản trị hoặc là chủ sở hữu thiết bị.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID của thiết bị cần thu hồi
 *     responses:
 *       200:
 *         description: Thu hồi thiết bị thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền thực hiện thao tác này
 *       404:
 *         description: Không tìm thấy thiết bị
 *       500:
 *         description: Lỗi server
 */
router.delete(
    '/:deviceId',
    authMiddleware,
    validateMiddleware(deviceIdForRevokeSchema),
    asyncHandler(userDeviceController.revokeDevice)
); // Revoke device

/**
 * @swagger
 * /api/user-devices/me/limit:
 *   get:
 *     tags:
 *       - User Device
 *     summary: Lấy thông tin giới hạn thiết bị của người dùng
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Trả về thông tin giới hạn thiết bị
 */
router.get(
    '/me/limit',
    authMiddleware,
    asyncHandler(userDeviceController.getDeviceLimitInfo)
);

/**
 * @swagger
 * /api/user-devices/me/current:
 *   get:
 *     tags:
 *       - User Device
 *     summary: Lấy thông tin thiết bị hiện tại
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Trả về thông tin thiết bị hiện tại
 */
router.get(
    '/me/current',
    authMiddleware,
    asyncHandler(userDeviceController.getCurrentDevice)
);

export default router;
