/**
 * Định nghĩa các route cho chức năng thông báo.
 * Sử dụng các middleware xác thực, phân quyền, và kiểm tra dữ liệu đầu vào.
 * Bao gồm các route CRUD cho thông báo, gửi/generate/kiểm tra OTP.
 */

import { Router, Request, Response, NextFunction } from 'express';
import NotificationController from '../controllers/notification.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import {
    notificationSchema,
    updateNotificationSchema,
    notificationIdSchema,
    notificationFilterSchema,
    sendOtpSchema, verifyOtpSchema
} from '../utils/validators';

const router = Router();
const notificationController = new NotificationController();

/**
 * Hàm wrapper để xử lý bất đồng bộ và bắt lỗi cho các controller.
 * @param fn Hàm controller bất đồng bộ
 * @returns Middleware Express xử lý lỗi
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Tạo mới một thông báo.
 * Yêu cầu xác thực, phân quyền và kiểm tra dữ liệu đầu vào.
 */
router.post(
    '/',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(notificationSchema),
    asyncHandler(notificationController.createNotification)
);

/**
 * Cập nhật thông báo theo ID.
 * Yêu cầu xác thực và kiểm tra dữ liệu đầu vào.
 */
router.put(
    '/:id',
    authMiddleware,
    validateMiddleware(notificationIdSchema),
    validateMiddleware(updateNotificationSchema),
    asyncHandler(notificationController.updateNotification)
);

/**
 * Xóa thông báo theo ID.
 * Yêu cầu xác thực, phân quyền và kiểm tra dữ liệu đầu vào.
 */
router.delete(
    '/:id',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(notificationIdSchema),
    asyncHandler(notificationController.deleteNotification)
);

/**
 * Lấy thông báo theo ID.
 * Yêu cầu xác thực và kiểm tra dữ liệu đầu vào.
 */
router.get(
    '/:id',
    authMiddleware,
    validateMiddleware(notificationIdSchema),
    asyncHandler(notificationController.getNotificationById)
);

/**
 * Lấy danh sách thông báo của người dùng hiện tại.
 * Yêu cầu xác thực.
 */
router.get(
    '/user',
    authMiddleware,
    asyncHandler(notificationController.getNotificationsByUser)
);

/**
 * Lấy tất cả thông báo với bộ lọc.
 * Yêu cầu xác thực, phân quyền và kiểm tra dữ liệu đầu vào.
 */
router.get(
    '/',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(notificationFilterSchema),
    asyncHandler(notificationController.getAllNotifications)
);

/**
 * Gửi OTP đến người dùng.
 * Kiểm tra dữ liệu đầu vào.
 */
router.post(
    '/otp',
    validateMiddleware(sendOtpSchema),
    asyncHandler(notificationController.sendOtp)
);

/**
 * Sinh OTP mới.
 * Kiểm tra dữ liệu đầu vào.
 */
router.post(
    '/otp/generate',
    validateMiddleware(sendOtpSchema),
    asyncHandler(notificationController.generateOtp)
);

/**
 * Xác thực OTP.
 * Kiểm tra dữ liệu đầu vào.
 */
router.post(
    '/otp/verify',
    validateMiddleware(verifyOtpSchema),
    asyncHandler(notificationController.verifyOtp)
);

export default router;