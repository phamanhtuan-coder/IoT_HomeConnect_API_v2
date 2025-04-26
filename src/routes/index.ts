import { Router } from 'express';
import authRoutes from './auth.routes';

import { NotificationController } from '../controllers/notification.controller';
import userDeviceRoutes from "./user-device.routes";
import syncTrackingRoutes from "./sync-tracking.routes";
import groupRoutes from "./group.routes";
import houseRoutes from "./house.routes";
import spaceRoutes from "./space.routes";

const router = Router();
const notificationController = new NotificationController();

router.use('/auth', authRoutes);
router.post('/notify/otp', notificationController.sendOtp); // New test endpoint
router.use('/user-devices', userDeviceRoutes);
router.use('/sync-tracking', syncTrackingRoutes);
router.use('/groups', groupRoutes);
router.use('/houses', houseRoutes); // Add this line
router.use('/spaces', spaceRoutes); // Add this line

export default router;