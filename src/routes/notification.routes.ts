/**
 * Định nghĩa các route cho chức năng thông báo.
 * @swagger
 * tags:
 *  name: Notification
 *  description: Quản lý thông báo và xác thực OTP
 */

import { Router, Request, Response, NextFunction } from 'express';
import NotificationController from '../controllers/notification.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import {sendOtpSchema, verifyOtpSchema} from "../utils/schemas/auth.schema";
import {
    notificationFilterSchema,
    notificationIdSchema, notificationSchema,
    updateNotificationSchema
} from "../utils/schemas/notification.schema";
import NotificationService from "../services/notification.service";


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
 * @swagger
 * /api/notifications:
 *   post:
 *     tags:
 *       - Notification
 *     summary: Tạo thông báo mới
 *     description: |
 *       Tạo một thông báo mới trong hệ thống.
 *       Yêu cầu xác thực bằng Employee Token (ADMIN/TECHNICIAN).
 *     security:
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin thông báo cần tạo
 *         schema:
 *           type: object
 *           required:
 *             - title
 *             - content
 *             - user_ids
 *           properties:
 *             title:
 *               type: string
 *               description: Tiêu đề thông báo
 *               example: "Bảo trì hệ thống"
 *             content:
 *               type: string
 *               description: Nội dung thông báo
 *               example: "Hệ thống sẽ bảo trì vào ngày 25/05/2025"
 *             user_ids:
 *               type: array
 *               items:
 *                 type: number
 *               description: Danh sách ID người dùng nhận thông báo
 *               example: [1, 2, 3]
 *     responses:
 *       201:
 *         description: Tạo thông báo thành công
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
 * @swagger
 * /api/notifications/{id}:
 *   get:
 *     tags:
 *       - Notification
 *     summary: Lấy thông tin thông báo theo ID
 *     description: |
 *       Lấy thông tin chi tiết của một thông báo.
 *       Yêu cầu xác thực (User hoặc Employee Token).
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: ID của thông báo cần xem
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết của thông báo
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: number
 *               description: ID của thông báo
 *             title:
 *               type: string
 *               description: Tiêu đề thông báo
 *             content:
 *               type: string
 *               description: Nội dung thông báo
 *             read:
 *               type: boolean
 *               description: Trạng thái đã đọc
 *             created_at:
 *               type: string
 *               format: date-time
 *               description: Thời gian tạo thông báo
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       404:
 *         description: Không tìm thấy thông báo
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/:id',
    authMiddleware,
    validateMiddleware(notificationIdSchema),
    asyncHandler(notificationController.getNotificationById)
);

/**
 * Lấy danh sách thông báo của người dùng hiện tại.
 * @swagger
 * /api/notifications/user:
 *   get:
 *     tags:
 *       - Notification
 *     summary: Lấy thông báo của người dùng
 *     description: |
 *       Lấy danh sách tất cả thông báo của người dùng hiện tại.
 *       Yêu cầu xác thực (User hoặc Employee Token).
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     responses:
 *       200:
 *         description: Trả về danh sách thông báo
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: number
 *                 description: ID của thông báo
 *               title:
 *                 type: string
 *                 description: Tiêu đề thông báo
 *               content:
 *                 type: string
 *                 description: Nội dung thông báo
 *               read:
 *                 type: boolean
 *                 description: Trạng thái đã đọc
 *               created_at:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian tạo thông báo
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/user',
    authMiddleware,
    asyncHandler(notificationController.getNotificationsByUser)
);

/**
 * Lấy tất cả thông báo với bộ lọc.
 * @swagger
 * /api/notifications:
 *   get:
 *     tags:
 *       - Notification
 *     summary: Lấy tất cả thông báo
 *     description: |
 *       Lấy danh sách tất cả thông báo trong hệ thống với bộ lọc.
 *       Yêu cầu xác thực bằng Employee Token (ADMIN/TECHNICIAN).
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: query
 *         name: read
 *         type: boolean
 *         description: Lọc theo trạng thái đã đọc
 *       - in: query
 *         name: from_date
 *         type: string
 *         format: date
 *         description: Lọc từ ngày (YYYY-MM-DD)
 *       - in: query
 *         name: to_date
 *         type: string
 *         format: date
 *         description: Lọc đến ngày (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Trả về danh sách thông báo
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không đủ quyền hạn (yêu cầu quyền ADMIN hoặc TECHNICIAN)
 *       500:
 *         description: Lỗi server
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
 * @swagger
 * /api/notifications/otp:
 *   post:
 *     tags:
 *       - Notification
 *     summary: Gửi mã OTP
 *     description: Gửi mã OTP đến email hoặc số điện thoại của người dùng
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin gửi OTP
 *         schema:
 *           type: object
 *           required:
 *             - type
 *             - target
 *           properties:
 *             type:
 *               type: string
 *               enum: [EMAIL, SMS]
 *               description: Phương thức gửi OTP
 *               example: "EMAIL"
 *             target:
 *               type: string
 *               description: Email hoặc số điện thoại nhận OTP
 *               example: "user@example.com"
 *     responses:
 *       200:
 *         description: Gửi OTP thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       500:
 *         description: Lỗi server
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
 * @swagger
 * /api/notifications/otp/verify:
 *   post:
 *     tags:
 *       - Notification
 *     summary: Xác thực mã OTP
 *     description: Kiểm tra tính hợp lệ của mã OTP được gửi đến người dùng
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin xác thực OTP
 *         schema:
 *           type: object
 *           required:
 *             - type
 *             - target
 *             - otp
 *           properties:
 *             type:
 *               type: string
 *               enum: [EMAIL, SMS]
 *               description: Phương thức nhận OTP
 *               example: "EMAIL"
 *             target:
 *               type: string
 *               description: Email hoặc số điện thoại đã nhận OTP
 *               example: "user@example.com"
 *             otp:
 *               type: string
 *               description: Mã OTP cần xác thực
 *               example: "123456"
 *     responses:
 *       200:
 *         description: Xác thực OTP thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ hoặc OTP không đúng
 *       404:
 *         description: Không tìm thấy OTP
 *       410:
 *         description: OTP đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.post(
    '/otp/verify',
    validateMiddleware(verifyOtpSchema),
    asyncHandler(notificationController.verifyOtp)
);

// Dùng để kiểm tra kết nối với Firebase Cloud Messaging (FCM)
router.get('/fcm', async (req: Request, res: Response) => {
    try {
        const notificationService = new NotificationService();
        const fcmHealthy = await notificationService.testFCMConnection();

        res.json({
            service: 'FCM',
            status: fcmHealthy ? 'healthy' : 'degraded',
            message: fcmHealthy
                ? 'Firebase Cloud Messaging is available'
                : 'FCM unavailable - push notifications disabled',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(503).json({
            service: 'FCM',
            status: 'unhealthy',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;

