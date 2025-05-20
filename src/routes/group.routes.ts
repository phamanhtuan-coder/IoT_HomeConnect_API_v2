/**
 * Định nghĩa các route liên quan đến nhóm (group) trong ứng dụng.
 * Sử dụng các middleware xác thực, phân quyền và kiểm tra dữ liệu đầu vào.
 *
 * @module routes/group.routes
 */

import {Router, Request, Response, NextFunction} from 'express';
import GroupController from '../controllers/group.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import {groupIdSchema, groupSchema, updateGroupRoleSchema, userGroupSchema} from "../utils/schemas/group.schema";

const router = Router();
const groupController = new GroupController();

/**
 * Hàm helper để xử lý các route bất đồng bộ, tự động bắt lỗi và chuyển cho middleware xử lý lỗi.
 *
 * @param fn Hàm controller bất đồng bộ
 * @returns Middleware Express
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Tạo mới một nhóm.
 * Yêu cầu xác thực và kiểm tra dữ liệu đầu vào.
 */
router.post(
    '/',
    authMiddleware,
    validateMiddleware(groupSchema),
    asyncHandler(groupController.createGroup)
);

/**
 * Lấy thông tin chi tiết của một nhóm theo groupId.
 * Yêu cầu xác thực, kiểm tra quyền trong nhóm và validate groupId.
 */
router.get(
    '/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(groupIdSchema),
    asyncHandler(groupController.getGroup)
);

/**
 * Cập nhật tên nhóm.
 * Yêu cầu xác thực, kiểm tra quyền trong nhóm và validate dữ liệu đầu vào.
 */
router.put(
    '/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(groupSchema),
    asyncHandler(groupController.updateGroupName)
);

/**
 * Xóa một nhóm.
 * Yêu cầu xác thực, kiểm tra quyền trong nhóm và validate groupId.
 */
router.delete(
    '/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(groupIdSchema),
    asyncHandler(groupController.deleteGroup)
);

/**
 * Thêm người dùng vào nhóm.
 * Yêu cầu xác thực, kiểm tra quyền trong nhóm và validate dữ liệu đầu vào.
 */
router.post(
    '/users',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(userGroupSchema),
    asyncHandler(groupController.addUserToGroup)
);

/**
 * Cập nhật vai trò của người dùng trong nhóm.
 * Yêu cầu xác thực, kiểm tra quyền trong nhóm và validate dữ liệu đầu vào.
 */
router.put(
    '/:groupId/users',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(updateGroupRoleSchema),
    asyncHandler(groupController.updateUserRole)
);

/**
 * Xóa người dùng khỏi nhóm.
 * Yêu cầu xác thực, kiểm tra quyền trong nhóm và validate dữ liệu đầu vào.
 */
router.delete(
    '/:groupId/users',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(updateGroupRoleSchema),
    asyncHandler(groupController.removeUserFromGroup)
);

export default router;