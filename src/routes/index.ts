import { Router } from 'express';
import authRoutes from './auth.routes';

import { NotificationController } from '../controllers/notification.controller';
import userDeviceRoutes from "./user-device.routes";
import syncTrackingRoutes from "./sync-tracking.routes";

const router = Router();
const notificationController = new NotificationController();

router.use('/auth', authRoutes);
router.post('/notify/otp', notificationController.sendOtp); // New test endpoint
router.use('/user-devices', userDeviceRoutes);
router.use('/sync-tracking', syncTrackingRoutes);

export default router;