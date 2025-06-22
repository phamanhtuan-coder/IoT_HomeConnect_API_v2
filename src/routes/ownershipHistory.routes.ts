import { Router, Request, Response, NextFunction } from 'express';
import OwnershipHistoryController from '../controllers/ownershipHistory.controller';
import authMiddleware  from '../middleware/auth.middleware';
import  validate  from '../middleware/validate.middleware';
import {restrictToDeviceOwner} from "../middleware/role.middleware";
import {
    approveOwnershipTransferSchema,
    ownershipHistoryIdSchema,
    ownershipTransferSchema
} from "../utils/schemas/sharing.schema";
import {serialNumberSchema} from "../utils/schemas/device.schema";

/**
 * Định nghĩa các route cho lịch sử chuyển nhượng quyền sở hữu thiết bị.
 * @swagger
 * tags:
 *  name: Ownership History
 *  description: Quản lý lịch sử chuyển nhượng quyền sở hữu thiết bị
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
 * @swagger
 * /api/ownership-history/transfer:
 *   post:
 *     tags:
 *       - Ownership History
 *     summary: Tạo yêu cầu chuyển nhượng quyền sở hữu thiết bị
 *     description: |
 *       Tạo một yêu cầu chuyển nhượng quyền sở hữu thiết bị.
 *       Yêu cầu xác thực và chỉ chủ sở hữu thiết bị mới được thực hiện.
 *     security:
 *       - Bearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin yêu cầu chuyển nhượng
 *         schema:
 *           type: object
 *           required:
 *             - device_serial
 *             - new_owner_id
 *           properties:
 *             device_serial:
 *               type: string
 *               description: Serial của thiết bị cần chuyển nhượng
 *             new_owner_id:
 *               type: string
 *               description: ID của người dùng sẽ được nhận quyền sở hữu
 *     responses:
 *       200:
 *         description: Tạo yêu cầu chuyển nhượng thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không phải chủ sở hữu thiết bị
 *       500:
 *         description: Lỗi server
 */
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
 * @swagger
 * /api/ownership-history/transfer/{ticketId}/approve:
 *   post:
 *     tags:
 *       - Ownership History
 *     summary: Phê duyệt yêu cầu chuyển nhượng
 *     description: Phê duyệt yêu cầu chuyển nhượng quyền sở hữu thiết bị
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         type: string
 *         description: ID của yêu cầu chuyển nhượng
 *     responses:
 *       200:
 *         description: Phê duyệt yêu cầu chuyển nhượng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy yêu cầu chuyển nhượng
 *       500:
 *         description: Lỗi server
 */
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
 * @swagger
 * /api/ownership-history/{historyId}:
 *   get:
 *     tags:
 *       - Ownership History
 *     summary: Lấy thông tin lịch sử chuyển nhượng theo ID
 *     description: Lấy chi tiết một lịch sử chuyển nhượng theo ID
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: historyId
 *         required: true
 *         type: string
 *         description: ID của lịch sử chuyển nhượng
 *     responses:
 *       200:
 *         description: Trả về thông tin lịch sử chuyển nhượng
 *         schema:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               description: ID của lịch sử chuyển nhượng
 *             device_serial:
 *               type: string
 *               description: Serial của thiết bị đư��c chuyển nhượng
 *             previous_owner_id:
 *               type: string
 *               description: ID của chủ sở hữu cũ
 *             new_owner_id:
 *               type: string
 *               description: ID của chủ sở hữu mới
 *             status:
 *               type: string
 *               description: Trạng thái của yêu cầu chuyển nhượng
 *             created_at:
 *               type: string
 *               format: date-time
 *               description: Thời điểm tạo yêu cầu
 *             updated_at:
 *               type: string
 *               format: date-time
 *               description: Thời điểm cập nhật gần nhất
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy lịch sử chuyển nhượng
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/:historyId',
    authMiddleware,
    validate(ownershipHistoryIdSchema),
    asyncHandler(ownershipHistoryController.getOwnershipHistoryById.bind(ownershipHistoryController))
);

/**
 * @swagger
 * /api/ownership-history/device/{device_serial}:
 *   get:
 *     tags:
 *       - Ownership History
 *     summary: Lấy lịch sử chuyển nhượng theo serial thiết bị
 *     description: Lấy danh sách tất cả lịch sử chuyển nhượng của một thiết bị
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: device_serial
 *         required: true
 *         type: string
 *         description: Serial của thiết bị
 *     responses:
 *       200:
 *         description: Trả về danh sách lịch sử chuyển nhượng của thiết bị
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *               device_serial:
 *                 type: string
 *               previous_owner_id:
 *                 type: string
 *               new_owner_id:
 *                 type: string
 *               status:
 *                 type: string
 *               created_at:
 *                 type: string
 *                 format: date-time
 *               updated_at:
 *                 type: string
 *                 format: date-time
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/device/:device_serial',
    authMiddleware,
    validate(serialNumberSchema),
    asyncHandler(ownershipHistoryController.getOwnershipHistoryByDevice.bind(ownershipHistoryController))
);

/**
 * @swagger
 * /api/ownership-history/user:
 *   get:
 *     tags:
 *       - Ownership History
 *     summary: Lấy lịch sử chuyển nhượng của người dùng
 *     description: Lấy danh sách tất cả lịch sử chuyển nhượng của người dùng hiện tại
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Trả về danh sách lịch sử chuyển nhượng của người dùng
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *               device_serial:
 *                 type: string
 *               previous_owner_id:
 *                 type: string
 *               new_owner_id:
 *                 type: string
 *               status:
 *                 type: string
 *               created_at:
 *                 type: string
 *                 format: date-time
 *               updated_at:
 *                 type: string
 *                 format: date-time
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/user',
    authMiddleware,
    asyncHandler(ownershipHistoryController.getOwnershipHistoryByUser.bind(ownershipHistoryController))
);

/**
 * @swagger
 * /api/ownership-history/{historyId}:
 *   delete:
 *     tags:
 *       - Ownership History
 *     summary: Xóa lịch sử chuyển nhượng
 *     description: Xóa một lịch sử chuyển nhượng theo ID
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: historyId
 *         required: true
 *         type: string
 *         description: ID của lịch sử chuyển nhượng cần xóa
 *     responses:
 *       200:
 *         description: Xóa lịch sử chuyển nhượng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy lịch sử chuyển nhượng
 *       500:
 *         description: Lỗi server
 */
router.delete(
    '/:historyId',
    authMiddleware,
    validate(ownershipHistoryIdSchema),
    asyncHandler(ownershipHistoryController.deleteOwnershipHistory.bind(ownershipHistoryController))
);

export default router;