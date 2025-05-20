/**
 * Định nghĩa các route liên quan đến đồng bộ lịch sử (sync tracking).
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
 * Lấy lịch sử đồng bộ của chính người dùng (mỗi thiết bị lấy bản mới nhất).
 */
router.get('/me', authMiddleware, asyncHandler(syncTrackingController.getOwnSyncHistory)); // Latest per device.ts

/**
 * Quản trị viên: Lấy lịch sử đồng bộ của người dùng (mỗi thiết bị lấy bản mới nhất).
 */
router.get('/:userId', authMiddleware, asyncHandler(syncTrackingController.getUserSyncHistory)); // Admin: latest per device.ts

/**
 * Quản trị viên: Lấy toàn bộ lịch sử đồng bộ của người dùng.
 */
router.get('/:userId/full', authMiddleware, asyncHandler(syncTrackingController.getFullUserSyncHistory)); // Admin: full history

export default router;
