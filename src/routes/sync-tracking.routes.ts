import express from 'express';
import { SyncTrackingController } from '../controllers/sync-tracking.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = express.Router();
const syncTrackingController = new SyncTrackingController();

router.get('/me', authMiddleware, syncTrackingController.getOwnSyncHistory); // User's own sync history
router.get('/:userId', authMiddleware, syncTrackingController.getUserSyncHistory); // Admin: any user's sync history

export default router;