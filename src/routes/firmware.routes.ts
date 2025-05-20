import { Router } from 'express';
import FirmwareController from '../controllers/firmware.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import { firmwareSchema, updateFirmwareSchema, firmwareIdSchema } from '../utils/validators';

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
 * Tạo mới firmware.
 * Yêu cầu: xác thực, phân quyền, kiểm tra dữ liệu đầu vào.
 */
router.post(
    '/',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(firmwareSchema),
    firmwareController.createFirmware
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
    firmwareController.updateFirmware
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
    firmwareController.deleteFirmware
);

/**
 * Lấy thông tin firmware theo ID.
 * Yêu cầu: xác thực, kiểm tra dữ liệu đầu vào.
 */
router.get(
    '/:firmwareId',
    authMiddleware,
    validateMiddleware(firmwareIdSchema),
    firmwareController.getFirmwareById
);

/**
 * Lấy danh sách tất cả firmware.
 * Yêu cầu: xác thực.
 */
router.get(
    '/',
    authMiddleware,
    firmwareController.getFirmwares
);

export default router;