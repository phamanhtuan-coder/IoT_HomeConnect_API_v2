/**
 * Định nghĩa các route liên quan đến đồng bộ lịch sử (sync tracking).
 * @swagger
 * tags:
 *  name: Sync Tracking
 *  description: Quản lý lịch sử đồng bộ thiết bị của người dùng
 *
 * - GET /me: Lấy lịch sử đồng bộ của chính người dùng (mỗi thiết bị lấy bản mới nhất).
 * - GET /:userId: Quản trị viên lấy lịch sử đồng bộ của người dùng (mỗi thiết bị lấy bản mới nhất).
 * - GET /:userId/full: Quản trị viên lấy toàn bộ lịch sử đồng bộ của người dùng.
 *
 * Sử dụng middleware xác thực để đảm bảo chỉ người dùng hợp lệ mới truy cập được.
 */

import express, { Request, Response, NextFunction } from 'express';
import { SyncTrackingController } from '../controllers/sync-tracking.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = express.Router();
const syncTrackingController = new SyncTrackingController();

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
 * /api/sync-tracking/me:
 *   get:
 *     tags:
 *       - Sync Tracking
 *     summary: Lấy lịch sử đồng bộ của người dùng hiện tại
 *     description: Lấy lịch sử đồng bộ mới nhất của mỗi thiết bị thuộc về người dùng hiện tại
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Trả về danh sách lịch sử đồng bộ
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: ID của bản ghi đồng bộ
 *               device_serial:
 *                 type: string
 *                 description: Serial của thiết bị
 *               user_id:
 *                 type: string
 *                 description: ID của người dùng
 *               sync_time:
 *                 type: string
 *                 format: date-time
 *                 description: Thời điểm đồng bộ
 *               status:
 *                 type: string
 *                 description: Trạng thái đồng bộ
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
/**
 * Lấy lịch sử đồng bộ của chính người dùng (mỗi thiết bị lấy bản mới nhất).
 */
router.get('/me', authMiddleware, asyncHandler(syncTrackingController.getOwnSyncHistory)); // Latest per device.ts

/**
 * @swagger
 * /api/sync-tracking/{userId}:
 *   get:
 *     tags:
 *       - Sync Tracking
 *     summary: Lấy lịch sử ��ồng bộ của người dùng cụ thể
 *     description: |
 *       Quản trị viên có thể xem lịch sử đồng bộ mới nhất của mỗi thiết bị
 *       của một người dùng cụ thể
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         type: string
 *         description: ID của người dùng cần xem lịch sử
 *     responses:
 *       200:
 *         description: Trả về danh sách lịch sử đồng bộ
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
 *               sync_time:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền admin
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi server
 */
/**
 * Quản trị viên: Lấy lịch sử đồng bộ của người dùng (mỗi thiết bị lấy bản mới nhất).
 */
router.get('/:userId', authMiddleware, asyncHandler(syncTrackingController.getUserSyncHistory)); // Admin: latest per device.ts

/**
 * @swagger
 * /api/sync-tracking/{userId}/full:
 *   get:
 *     tags:
 *       - Sync Tracking
 *     summary: Lấy toàn bộ lịch sử đồng bộ của người dùng
 *     description: |
 *       Quản trị viên có thể xem toàn bộ lịch sử đồng bộ
 *       (bao gồm cả các bản ghi cũ) của một người dùng
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         type: string
 *         description: ID của người dùng cần xem lịch sử
 *     responses:
 *       200:
 *         description: Trả về toàn bộ lịch sử đồng bộ
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
 *               sync_time:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền admin
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi server
 */
/**
 * Quản trị viên: Lấy toàn bộ lịch sử đồng bộ của người dùng.
 */
router.get('/:userId/full', authMiddleware, asyncHandler(syncTrackingController.getFullUserSyncHistory)); // Admin: full history

export default router;
