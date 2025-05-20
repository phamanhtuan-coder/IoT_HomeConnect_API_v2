/**
 * Định nghĩa các route liên quan đến đồng bộ lịch sử (sync tracking).
 *
 * - GET /me: Lấy lịch sử đồng bộ của chính người dùng (mỗi thiết bị lấy bản mới nhất).
 * - GET /:userId: Quản trị viên lấy lịch sử đồng bộ của người dùng (mỗi thiết bị lấy bản mới nhất).
 * - GET /:userId/full: Quản trị viên lấy toàn bộ lịch sử đồng bộ của người dùng.
 *
 * Sử dụng middleware xác thực để đảm bảo chỉ người dùng hợp lệ mới truy cập được.
 */

import express from 'express';
import { SyncTrackingController } from '../controllers/sync-tracking.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = express.Router();
const syncTrackingController = new SyncTrackingController();

/**
 * Lấy lịch sử đồng bộ của chính người dùng (mỗi thiết bị lấy bản mới nhất).
 */
router.get('/me', authMiddleware, syncTrackingController.getOwnSyncHistory); // Latest per device.ts

/**
 * Quản trị viên: Lấy lịch sử đồng bộ của người dùng (mỗi thiết bị lấy bản mới nhất).
 */
router.get('/:userId', authMiddleware, syncTrackingController.getUserSyncHistory); // Admin: latest per device.ts

/**
 * Quản trị viên: Lấy toàn bộ lịch sử đồng bộ của người dùng.
 */
router.get('/:userId/full', authMiddleware, syncTrackingController.getFullUserSyncHistory); // Admin: full history

export default router;