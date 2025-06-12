/**
 * Định nghĩa các route chính cho ứng dụng.
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: Quản lý xác thực người dùng (đăng nhập, đăng ký, quên mật khẩu)
 *   - name: User Device
 *     description: Quản lý thiết bị của người dùng
 *   - name: Sync Tracking
 *     description: Theo dõi đồng bộ hóa dữ liệu thiết bị
 *   - name: Group
 *     description: Quản lý nhóm người dùng
 *   - name: House
 *     description: Quản lý nhà thông minh
 *   - name: Space
 *     description: Quản lý không gian trong nhà
 *   - name: Device
 *     description: Quản lý thiết bị IoT
 *   - name: Shared Permission
 *     description: Quản lý quyền chia sẻ thiết bị
 *   - name: Share Request
 *     description: Quản lý yêu cầu chia sẻ thiết bị
 *   - name: Alert Type
 *     description: Quản lý các loại cảnh báo
 *   - name: Alert
 *     description: Quản lý cảnh báo từ thiết bị
 *   - name: Ticket Type
 *     description: Quản lý các loại vé hỗ trợ
 *   - name: Ticket
 *     description: Quản lý vé hỗ trợ kỹ thuật
 *   - name: Ownership History
 *     description: Quản lý lịch sử chuyển nhượng quyền sở hữu thiết bị
 *   - name: Firmware
 *     description: Quản lý firmware cho thiết bị
 *   - name: Firmware Update History
 *     description: Quản lý lịch sử cập nhật firmware
 *   - name: Notification
 *     description: Quản lý thông báo
 *   - name: Component
 *     description: Quản lý các linh kiện
 *   - name: Template Component
 *     description: Quản lý các template cho các linh kiện lắp ráp thiết bị
 *   - name: Device Template
 *     description: Quản ly các template cho các thiết bị IoT
 *   - name: Production Components
 *     description: Quản lý linh kiện sử dụng trong quy trình sản xuất
 *   - name: Production Tracking
 *     description: Quản lý theo dõi quá trình sản xuất
 *   - name: Production Batches
 *     description: Quản lý theo dõi các lô sản xuất
 *
 *
 * @swagger
 * components:
 *   securitySchemes:
 *     Bearer:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JSON Web Token (JWT) được sử dụng để xác thực. Thêm 'Bearer' trước token trong header
 *   responses:
 *     UnauthorizedError:
 *       description: Không có quyền truy cập hoặc token không hợp lệ
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Unauthorized
 *     ForbiddenError:
 *       description: Không có quyền thực hiện hành động này
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Forbidden
 *     NotFoundError:
 *       description: Không tìm thấy tài nguyên
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Resource not found
 *     ValidationError:
 *       description: Dữ liệu đầu vào không hợp lệ
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Validation failed
 *               errors:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                     message:
 *                       type: string
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
import ticketTypeRoutes from "./ticket-type.routes";
import ticketRoutes from "./ticket.routes";
import ownershipHistoryRoutes from "./ownershipHistory.routes";
import firmwareRoutes from "./firmware.routes";
import notificationRoutes from "./notification.routes";
import alertRoutes from "./alert.routes";
import firmwareUpdateHistoryRoutes from "./firmware-update-history.routes";
import componentRoutes from "./component.routes";
import templateComponentRoutes from "./template-component.routes";
import deviceTemplateRoutes from "./device-template.routes";
import productionTrackingRoutes from "./production-tracking.routes";
import planningRoutes from "./planning.routes";
import sseRoutes from './sse.routes';
import productionBatchesRoutes from './production-batches.routes';
import customerSearchRoutes from './customer-search.routes';


const router = Router();

// Định nghĩa các route con
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
router.use('/alert-types', alertTypeRoutes);
router.use('/alerts', alertRoutes);
router.use('/ticket-types', ticketTypeRoutes);
router.use('/tickets', ticketRoutes);
router.use('/ownership-history', ownershipHistoryRoutes);
router.use('/firmware', firmwareRoutes);
router.use('/firmware-update-history', firmwareUpdateHistoryRoutes);
router.use('/component',componentRoutes)
router.use('/template-components', templateComponentRoutes);
router.use('/device-templates', deviceTemplateRoutes);
router.use('/production-tracking', productionTrackingRoutes);
router.use('/planning', planningRoutes);
router.use('/production-batches', productionBatchesRoutes);
router.use('/sse', sseRoutes);
router.use('/customer-search', customerSearchRoutes);

export default router;


