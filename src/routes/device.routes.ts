/**
 * Định nghĩa các route cho thao tác với thiết bị (device).
 * Sử dụng các middleware xác thực, phân quyền, và kiểm tra dữ liệu đầu vào.
 *
 * Các route bao gồm:
 * - Tạo thiết bị mới
 * - Liên kết thiết bị
 * - Bật/tắt thiết bị
 * - Cập nhật thuộc tính thiết bị
 * - Lấy danh sách thiết bị theo tài khoản, nhóm, nhà, không gian
 * - Lấy thông tin thiết bị theo ID
 * - Gỡ liên kết thiết bị
 * - Cập nhật không gian của thiết bị
 * - Cập nhật thông tin wifi của thiết bị
 */

import { Router, Request, Response, NextFunction } from 'express';
import DeviceController from '../controllers/device.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import { deviceSchema, deviceIdSchema, linkDeviceSchema, toggleDeviceSchema, updateAttributesSchema, updateWifiSchema } from '../utils/validators';

const router = Router();
const deviceController = new DeviceController();

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
 * Tạo thiết bị mới.
 * Yêu cầu xác thực, phân quyền nhóm, và kiểm tra dữ liệu đầu vào.
 */
router.post(
    '/',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(deviceSchema),
    asyncHandler(deviceController.createDevice)
);

/**
 * Liên kết thiết bị với tài khoản hoặc nhóm.
 * Yêu cầu xác thực, phân quyền nhóm, và kiểm tra dữ liệu đầu vào.
 */
router.post(
    '/link',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(linkDeviceSchema),
    asyncHandler(deviceController.linkDevice)
);

/**
 * Bật/tắt thiết bị.
 * Yêu cầu xác thực và kiểm tra dữ liệu đầu vào.
 */
router.put(
    '/:deviceId/toggle',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(toggleDeviceSchema),
    asyncHandler(deviceController.toggleDevice)
);

/**
 * Cập nhật thuộc tính của thiết bị.
 * Yêu cầu xác thực và kiểm tra dữ liệu đầu vào.
 */
router.put(
    '/:deviceId/attributes',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(updateAttributesSchema),
    asyncHandler(deviceController.updateDeviceAttributes)
);

/**
 * Lấy danh sách thiết bị theo tài khoản.
 * Yêu cầu xác thực.
 */
router.get(
    '/account',
    authMiddleware,
    asyncHandler(deviceController.getDevicesByAccount)
);

/**
 * Lấy danh sách thiết bị theo nhóm.
 * Yêu cầu xác thực và phân quyền nhóm.
 */
router.get(
    '/group/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(deviceController.getDevicesByGroup)
);

/**
 * Lấy danh sách thiết bị theo nhà.
 * Yêu cầu xác thực và phân quyền nhóm.
 */
router.get(
    '/house/:houseId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(deviceController.getDevicesByHouse)
);

/**
 * Lấy danh sách thiết bị theo không gian.
 * Yêu cầu xác thực và phân quyền nhóm.
 */
router.get(
    '/space/:spaceId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(deviceController.getDevicesBySpace)
);

/**
 * Lấy thông tin thiết bị theo ID.
 * Yêu cầu xác thực và kiểm tra dữ liệu đầu vào.
 */
router.get(
    '/:deviceId',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    asyncHandler(deviceController.getDeviceById)
);

/**
 * Gỡ liên kết thiết bị.
 * Yêu cầu xác thực, phân quyền nhóm, và kiểm tra dữ liệu đầu vào.
 */
router.delete(
    '/:deviceId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(deviceIdSchema),
    asyncHandler(deviceController.unlinkDevice)
);

/**
 * Cập nhật không gian cho thiết bị.
 * Yêu cầu xác thực, phân quyền nhóm, và kiểm tra dữ liệu đầu vào.
 */
router.put(
    '/:deviceId/space',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(deviceIdSchema),
    asyncHandler(deviceController.updateDeviceSpace)
);

/**
 * Cập nhật thông tin wifi cho thiết bị.
 * Yêu cầu xác thực, phân quyền nhóm, và kiểm tra dữ liệu đầu vào.
 */
router.put(
    '/:deviceId/wifi',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(updateWifiSchema),
    asyncHandler(deviceController.updateDeviceWifi)
);

export default router;