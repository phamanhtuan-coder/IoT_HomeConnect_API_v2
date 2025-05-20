/**
 * Định nghĩa các route cho resource Space.
 * Sử dụng các middleware xác thực, phân quyền, và validate dữ liệu.
 *
 * Các endpoint:
 * - POST   /                : Tạo mới một Space
 * - GET    /house/:houseId  : Lấy danh sách Space theo House
 * - GET    /:spaceId        : Lấy thông tin chi tiết một Space
 * - PUT    /:spaceId        : Cập nhật thông tin một Space
 * - DELETE /:spaceId        : Xoá một Space
 * - GET    /:spaceId/name   : Lấy tên của một Space
 */

import { Router, Request, Response, NextFunction } from 'express';
import SpaceController from '../controllers/space.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import { spaceSchema, spaceIdSchema } from '../utils/validators';

const router = Router();
const spaceController = new SpaceController();

/**
 * Wrapper cho các hàm async để bắt lỗi và chuyển tới middleware xử lý lỗi.
 * @param fn Hàm async handler
 * @returns Middleware Express
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Tạo mới một Space.
 * Yêu cầu: xác thực, phân quyền, validate dữ liệu đầu vào.
 */
router.post(
    '/',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(spaceSchema),
    asyncHandler(spaceController.createSpace)
);

/**
 * Lấy danh sách các Space theo House.
 * Yêu cầu: xác thực, phân quyền.
 */
router.get(
    '/house/:houseId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(spaceController.getSpacesByHouse)
);

/**
 * Lấy thông tin chi tiết một Space theo ID.
 * Yêu cầu: xác thực, phân quyền, validate spaceId.
 */
router.get(
    '/:spaceId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(spaceIdSchema),
    asyncHandler(spaceController.getSpaceById)
);

/**
 * Cập nhật thông tin một Space.
 * Yêu cầu: xác thực, phân quyền, validate dữ liệu đầu vào.
 */
router.put(
    '/:spaceId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(spaceSchema),
    asyncHandler(spaceController.updateSpace)
);

/**
 * Xoá một Space theo ID.
 * Yêu cầu: xác thực, phân quyền, validate spaceId.
 */
router.delete(
    '/:spaceId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(spaceIdSchema),
    asyncHandler(spaceController.deleteSpace)
);

/**
 * Lấy tên của một Space theo ID.
 * Yêu cầu: xác thực, phân quyền, validate spaceId.
 */
router.get(
    '/:spaceId/name',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(spaceIdSchema),
    asyncHandler(spaceController.getSpaceName)
);

export default router;