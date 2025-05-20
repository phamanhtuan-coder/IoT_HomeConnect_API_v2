/**
 * Định nghĩa các route cho tài nguyên House.
 * Sử dụng các middleware xác thực, phân quyền, và validate dữ liệu.
 *
 * Các endpoint:
 * - POST   /                : Tạo mới một house
 * - GET    /group/:groupId  : Lấy danh sách house theo group
 * - GET    /:houseId        : Lấy thông tin house theo id
 * - PUT    /:houseId        : Cập nhật thông tin house
 * - DELETE /:houseId        : Xoá house
 */

import { Router, Request, Response, NextFunction } from 'express';
import HouseController from '../controllers/house.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import { houseSchema, houseIdSchema } from '../utils/validators';

const router = Router();
const houseController = new HouseController();

/**
 * Hàm helper để xử lý các controller async, tự động bắt lỗi và chuyển tới middleware xử lý lỗi.
 * @param fn Hàm controller async
 * @returns Middleware Express
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Tạo mới một house.
 * Yêu cầu: xác thực, phân quyền group, validate dữ liệu đầu vào.
 */
router.post(
    '/',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(houseSchema),
    asyncHandler(houseController.createHouse)
);

/**
 * Lấy danh sách house theo groupId.
 * Yêu cầu: xác thực, phân quyền group.
 */
router.get(
    '/group/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(houseController.getHousesByGroup)
);

/**
 * Lấy thông tin house theo houseId.
 * Yêu cầu: xác thực, phân quyền group, validate houseId.
 */
router.get(
    '/:houseId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(houseIdSchema),
    asyncHandler(houseController.getHouseById)
);

/**
 * Cập nhật thông tin house theo houseId.
 * Yêu cầu: xác thực, phân quyền group, validate dữ liệu đầu vào.
 */
router.put(
    '/:houseId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(houseSchema),
    asyncHandler(houseController.updateHouse)
);

/**
 * Xoá house theo houseId.
 * Yêu cầu: xác thực, phân quyền group, validate houseId.
 */
router.delete(
    '/:houseId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(houseIdSchema),
    asyncHandler(houseController.deleteHouse)
);

export default router;