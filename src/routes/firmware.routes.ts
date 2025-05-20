import { Router, Request, Response, NextFunction } from 'express';
import FirmwareController from '../controllers/firmware.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import {firmwareIdSchema, firmwareSchema, updateFirmwareSchema} from "../utils/schemas/firmware.schema";

/**
 * Định nghĩa các route cho quản lý firmware.
 *
 * Các route này bao gồm:
 * - Tạo mới firmware
 * - Cập nhật firmware
 * - Xoá firmware
 * - Lấy thông tin firmware theo ID
 * - Lấy danh sách firmware
 *
 * Tất cả các route đều yêu cầu xác thực và phân quyền.
 */

const router = Router();
const firmwareController = new FirmwareController();

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
 * Tạo mới firmware.
 * Yêu cầu: xác thực, phân quyền, kiểm tra dữ liệu đầu vào.
 */
router.post(
    '/',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(firmwareSchema),
    asyncHandler(firmwareController.createFirmware)
);

/**
 * Cập nhật firmware theo ID.
 * Yêu cầu: xác thực, phân quyền, kiểm tra dữ liệu đầu vào.
 */
router.put(
    '/:firmwareId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(updateFirmwareSchema),
    asyncHandler(firmwareController.updateFirmware)
);

/**
 * Xoá firmware theo ID.
 * Yêu cầu: xác thực, phân quyền, kiểm tra dữ liệu đầu vào.
 */
router.delete(
    '/:firmwareId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(firmwareIdSchema),
    asyncHandler(firmwareController.deleteFirmware)
);

/**
 * Lấy thông tin firmware theo ID.
 * Yêu cầu: xác thực, kiểm tra dữ liệu đầu vào.
 */
router.get(
    '/:firmwareId',
    authMiddleware,
    validateMiddleware(firmwareIdSchema),
    asyncHandler(firmwareController.getFirmwareById)
);

/**
 * Lấy danh sách tất cả firmware.
 * Yêu cầu: xác thực.
 */
router.get(
    '/',
    authMiddleware,
    asyncHandler(firmwareController.getFirmwares)
);

export default router;
