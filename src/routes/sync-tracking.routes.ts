import express from 'express';
import { SyncTrackingController } from '../controllers/sync-tracking.controller';
import  authMiddleware  from '../middleware/auth.middleware';

const router = express.Router();
const syncTrackingController = new SyncTrackingController();

router.get('/me', authMiddleware, syncTrackingController.getOwnSyncHistory); // Latest per device.ts
router.get('/:userId', authMiddleware, syncTrackingController.getUserSyncHistory); // Admin: latest per device.ts
router.get('/:userId/full', authMiddleware, syncTrackingController.getFullUserSyncHistory); // Admin: full history

export default router;