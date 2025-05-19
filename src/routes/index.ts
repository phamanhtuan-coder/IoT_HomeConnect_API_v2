import { Router } from 'express';
import authRoutes from './auth.routes';

import { NotificationController } from '../controllers/notification.controller';
import userDeviceRoutes from "./user-device.routes";
import syncTrackingRoutes from "./sync-tracking.routes";
import groupRoutes from "./group.routes";
import houseRoutes from "./house.routes";
import spaceRoutes from "./space.routes";
import deviceRoutes from "./device.routes";
import sharedPermissionRoutes from "./sharedPermission.routes";
import shareRequestRoutes from "./shareRequest.routes";
import alertTypeRoutes from "./alert-type.routes";
import alertRoutes from "./alert.routes";
import ticketTypeRoutes from "./ticket-type.routes";


const router = Router();
const notificationController = new NotificationController();

router.use('/auth', authRoutes);
router.post('/notify/otp', notificationController.sendOtp);
router.use('/user-devices', userDeviceRoutes);
router.use('/sync-tracking', syncTrackingRoutes);
router.use('/groups', groupRoutes);
router.use('/houses', houseRoutes);
router.use('/spaces', spaceRoutes);
router.use('/devices', deviceRoutes);
router.use('/permissions', sharedPermissionRoutes);
router.use('/share-requests', shareRequestRoutes);
router.use("/alert-types", alertTypeRoutes);
router.use("/alerts", alertRoutes);
router.use("/api/ticket-types", ticketTypeRoutes);

export default router;