import { Router, Request, Response, NextFunction } from 'express';
import FirmwareUpdateHistoryController from '../controllers/firmware-update-history.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import {
    firmwareUpdateHistoryFilterSchema,
    firmwareUpdateHistoryIdSchema,
    firmwareUpdateHistorySchema,
    updateFirmwareUpdateHistorySchema
} from "../utils/schemas/firmware.schema";

/**
 * Định nghĩa các route cho lịch sử cập nhật firmware.
 *
 * Các route này bao gồm:
 * - Tạo mới lịch sử cập nhật firmware
 * - Cập nhật lịch sử cập nhật firmware
 * - Xoá lịch sử cập nhật firmware
 * - Lấy chi tiết lịch sử cập nhật firmware theo ID
 * - Lấy danh sách lịch sử cập nhật firmware với bộ lọc
 *
 * Tất cả các route đều yêu cầu xác thực và phân quyền.
 */

const router = Router();
const firmwareUpdateHistoryController = new FirmwareUpdateHistoryController();

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
 * Tạo mới một bản ghi lịch sử cập nhật firmware.
 * Yêu cầu: xác thực, phân quyền, kiểm tra dữ liệu đầu vào.
 */
router.post(
    '/',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(firmwareUpdateHistorySchema),
    asyncHandler(firmwareUpdateHistoryController.createFirmwareUpdateHistory)
);

/**
 * Cập nhật một bản ghi lịch sử cập nhật firmware theo updateId.
 * Yêu cầu: xác thực, phân quyền, kiểm tra dữ liệu đầu vào.
 */
router.put(
    '/:updateId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(updateFirmwareUpdateHistorySchema),
    asyncHandler(firmwareUpdateHistoryController.updateFirmwareUpdateHistory)
);

/**
 * Xoá một bản ghi lịch sử cập nhật firmware theo updateId.
 * Yêu cầu: xác thực, phân quyền, kiểm tra dữ liệu đầu vào.
 */
router.delete(
    '/:updateId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(firmwareUpdateHistoryIdSchema),
    asyncHandler(firmwareUpdateHistoryController.deleteFirmwareUpdateHistory)
);

/**
 * Lấy chi tiết một bản ghi lịch sử cập nhật firmware theo updateId.
 * Yêu cầu: xác thực, kiểm tra dữ liệu đầu vào.
 */
router.get(
    '/:updateId',
    authMiddleware,
    validateMiddleware(firmwareUpdateHistoryIdSchema),
    asyncHandler(firmwareUpdateHistoryController.getFirmwareUpdateHistoryById)
);

/**
 * Lấy danh sách các bản ghi lịch sử cập nhật firmware với bộ lọc.
 * Yêu cầu: xác thực, kiểm tra dữ liệu đầu vào.
 */
router.get(
    '/',
    authMiddleware,
    validateMiddleware(firmwareUpdateHistoryFilterSchema),
    asyncHandler(firmwareUpdateHistoryController.getFirmwareUpdateHistories)
);

export default router;
