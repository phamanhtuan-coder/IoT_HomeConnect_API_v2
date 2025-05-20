/**
 * Định nghĩa các route chính cho ứng dụng.
 *
 * Sử dụng Express Router để gom nhóm các route con liên quan đến:
 * - Xác thực người dùng
 * - Thông báo
 * - Quản lý thiết bị người dùng
 * - Đồng bộ tracking
 * - Quản lý nhóm, nhà, không gian, thiết bị
 * - Phân quyền chia sẻ, yêu cầu chia sẻ
 * - Quản lý loại cảnh báo, cảnh báo
 * - Quản lý loại ticket, ticket
 * - Lịch sử sở hữu thiết bị
 * - Quản lý firmware và lịch sử cập nhật firmware
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
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
import ticketRoutes from "./ticket.routes";
import ownershipHistoryRoutes from "./ownershipHistory.routes";
import firmwareRoutes from "./firmware.routes";
import firmwareUpdateHistoryRoutes from "./firmware-update-history.routes";
import notificationRoutes from "./notification.routes";

/**
 * Khởi tạo router chính.
 */
const router = Router();

/**
 * Định nghĩa các route con cho từng chức năng.
 */
router.use('/auth', authRoutes);
router.use('/notifications', notificationRoutes);
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
router.use("/ticket-types", ticketTypeRoutes);
router.use("/tickets", ticketRoutes)
router.use("/ownership-history.ts",ownershipHistoryRoutes)
router.use("/firmware",firmwareRoutes)
router.use('/firmware-update-history', firmwareUpdateHistoryRoutes);

/**
 * Xuất router để sử dụng trong ứng dụng chính.
 */
export default router;