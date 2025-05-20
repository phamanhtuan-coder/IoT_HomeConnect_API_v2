import { Router, Request, Response, NextFunction } from 'express';
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
 * Tạo yêu cầu chuyển nhượng quyền sở hữu thiết bị.
 * Yêu cầu xác thực, chỉ chủ sở hữu thiết bị mới được thực hiện.
 */
router.post(
    '/transfer',
    authMiddleware,
    restrictToDeviceOwner,
    validate(ownershipTransferSchema),
    asyncHandler(ownershipHistoryController.initiateOwnershipTransfer.bind(ownershipHistoryController))
);

/**
 * Phê duyệt yêu cầu chuyển nhượng quyền sở hữu thiết bị.
 * Yêu cầu xác thực.
 */
router.post(
    '/transfer/:ticketId/approve',
    authMiddleware,
    validate(approveOwnershipTransferSchema),
    asyncHandler(ownershipHistoryController.approveOwnershipTransfer.bind(ownershipHistoryController))
);

/**
 * Lấy thông tin lịch sử chuyển nhượng theo ID.
 * Yêu cầu xác thực.
 */
router.get(
    '/:historyId',
    authMiddleware,
    validate(ownershipHistoryIdSchema),
    asyncHandler(ownershipHistoryController.getOwnershipHistoryById.bind(ownershipHistoryController))
);

/**
 * Lấy lịch sử chuyển nhượng theo serial thiết bị.
 * Yêu cầu xác thực.
 */
router.get(
    '/device/:device_serial',
    authMiddleware,
    validate(deviceSerialSchema),
    asyncHandler(ownershipHistoryController.getOwnershipHistoryByDevice.bind(ownershipHistoryController))
);

/**
 * Lấy lịch sử chuyển nhượng của người dùng hiện tại.
 * Yêu cầu xác thực.
 */
router.get(
    '/user',
    authMiddleware,
    asyncHandler(ownershipHistoryController.getOwnershipHistoryByUser.bind(ownershipHistoryController))
);

/**
 * Xoá lịch sử chuyển nhượng theo ID.
 * Yêu cầu xác thực.
 */
router.delete(
    '/:historyId',
    authMiddleware,
    validate(ownershipHistoryIdSchema),
    asyncHandler(ownershipHistoryController.deleteOwnershipHistory.bind(ownershipHistoryController))
);

export default router;
