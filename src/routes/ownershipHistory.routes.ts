import { Router } from 'express';
import OwnershipHistoryController from '../controllers/ownershipHistory.controller';
import authMiddleware  from '../middleware/auth.middleware';
import  validate  from '../middleware/validate.middleware';
import {
    ownershipTransferSchema,
    approveOwnershipTransferSchema,
    ownershipHistoryIdSchema,
    deviceSerialSchema,
} from '../utils/validators';
import {restrictToDeviceOwner} from "../middleware/role.middleware";

/**
 * Định nghĩa các route cho lịch sử chuyển nhượng quyền sở hữu thiết bị.
 *
 * Các route bao gồm:
 * - Chuyển nhượng quyền sở hữu thiết bị
 * - Phê duyệt chuyển nhượng
 * - Lấy lịch sử chuyển nhượng theo ID
 * - Lấy lịch sử chuyển nhượng theo serial thiết bị
 * - Lấy lịch sử chuyển nhượng theo người dùng
 * - Xoá lịch sử chuyển nhượng
 */

const router = Router();
const ownershipHistoryController = new OwnershipHistoryController();

/**
 * Tạo yêu cầu chuyển nhượng quyền sở hữu thiết bị.
 * Yêu cầu xác thực, chỉ chủ sở hữu thiết bị mới được thực hiện.
 */
router.post(
    '/transfer',
    authMiddleware,
    restrictToDeviceOwner,
    validate(ownershipTransferSchema),
    ownershipHistoryController.initiateOwnershipTransfer.bind(ownershipHistoryController)
);

/**
 * Phê duyệt yêu cầu chuyển nhượng quyền sở hữu thiết bị.
 * Yêu cầu xác thực.
 */
router.post(
    '/transfer/:ticketId/approve',
    authMiddleware,
    validate(approveOwnershipTransferSchema),
    ownershipHistoryController.approveOwnershipTransfer.bind(ownershipHistoryController)
);

/**
 * Lấy thông tin lịch sử chuyển nhượng theo ID.
 * Yêu cầu xác thực.
 */
router.get(
    '/:historyId',
    authMiddleware,
    validate(ownershipHistoryIdSchema),
    ownershipHistoryController.getOwnershipHistoryById.bind(ownershipHistoryController)
);

/**
 * Lấy lịch sử chuyển nhượng theo serial thiết bị.
 * Yêu cầu xác thực.
 */
router.get(
    '/device/:device_serial',
    authMiddleware,
    validate(deviceSerialSchema),
    ownershipHistoryController.getOwnershipHistoryByDevice.bind(ownershipHistoryController)
);

/**
 * Lấy lịch sử chuyển nhượng của người dùng hiện tại.
 * Yêu cầu xác thực.
 */
router.get(
    '/user',
    authMiddleware,
    ownershipHistoryController.getOwnershipHistoryByUser.bind(ownershipHistoryController)
);

/**
 * Xoá lịch sử chuyển nhượng theo ID.
 * Yêu cầu xác thực.
 */
router.delete(
    '/:historyId',
    authMiddleware,
    validate(ownershipHistoryIdSchema),
    ownershipHistoryController.deleteOwnershipHistory.bind(ownershipHistoryController)
);

export default router;