/**
 * Định nghĩa các route liên quan đến nhóm (group) trong ứng dụng.
 * @swagger
 * tags:
 *  name: Group
 *  description: Quản lý các nhóm thiết bị và phân quyền người dùng trong nhóm
 */

import {Router, Request, Response, NextFunction} from 'express';
import GroupController from '../controllers/group.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import {
    groupIdSchema,
    groupSchema,
    userGroupSchema,
    paginationSchema,
    updateGroupRoleSchema,
    myGroupsSchema
} from "../utils/schemas/group.schema";

const router = Router();
const groupController = new GroupController();

/**
 * Hàm helper để xử lý các controller bất đồng bộ và bắt lỗi.
 * @param fn Hàm controller bất đồng bộ
 * @returns Middleware Express xử lý lỗi bất đồng bộ
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Lấy danh sách nhóm của người dùng hiện tại.
 * @swagger
 * /api/groups/my-groups:
 *   get:
 *     tags: [Group]
 *     summary: Lấy danh sách nhóm của người dùng
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng kết quả trên mỗi trang
 */
router.get(
    '/my-groups',
    authMiddleware,
    validateMiddleware(paginationSchema),
    asyncHandler(groupController.getGroupsByUsername)
);

/**
 * Tạo mới một nhóm.
 * @swagger
 * /api/groups:
 *   post:
 *     tags: [Group]
 *     summary: Tạo nhóm mới
 *     security:
 *       - UserBearer: []
 */
router.post(
    '/',
    authMiddleware,
    validateMiddleware(groupSchema),
    asyncHandler(groupController.createGroup)
);

/**
 * Lấy thông tin chi tiết của một nhóm.
 * @swagger
 * /api/groups/{groupId}:
 *   get:
 *     tags: [Group]
 *     summary: Lấy thông tin nhóm theo ID
 *     security:
 *       - UserBearer: []
 */
router.get(
    '/:groupId',
    authMiddleware,
    validateMiddleware(groupIdSchema),
    groupRoleMiddleware,
    asyncHandler(groupController.getGroup)
);

/**
 * Cập nhật thông tin nhóm.
 * @swagger
 * /api/groups/{groupId}:
 *   put:
 *     tags: [Group]
 *     summary: Cập nhật thông tin nhóm
 *     security:
 *       - UserBearer: []
 */
router.put(
    '/:groupId',
    authMiddleware,
    validateMiddleware(groupIdSchema),
    groupRoleMiddleware,
    validateMiddleware(groupSchema),
    asyncHandler(groupController.updateGroup)
);

/**
 * Xóa nhóm.
 * @swagger
 * /api/groups/{groupId}:
 *   delete:
 *     tags: [Group]
 *     summary: Xóa nhóm
 *     security:
 *       - UserBearer: []
 */
router.delete(
    '/:groupId',
    authMiddleware,
    validateMiddleware(groupIdSchema),
    groupRoleMiddleware,
    asyncHandler(groupController.deleteGroup)
);

/**
 * Thêm người dùng vào nhóm.
 * @swagger
 * /api/groups/members:
 *   post:
 *     tags: [Group]
 *     summary: Thêm người dùng vào nhóm
 *     security:
 *       - UserBearer: []
 */
router.post(
    '/members',
    authMiddleware,
    validateMiddleware(userGroupSchema),
    groupRoleMiddleware,
    asyncHandler(groupController.addUserToGroup)
);

/**
 * Cập nhật vai trò của người dùng trong nhóm.
 * @swagger
 * /api/groups/{groupId}/members/role:
 *   put:
 *     tags: [Group]
 *     summary: Cập nhật vai trò của người dùng trong nhóm
 *     security:
 *       - UserBearer: []
 */
router.put(
    '/:groupId/members/role',
    authMiddleware,
    validateMiddleware(updateGroupRoleSchema),
    groupRoleMiddleware,
    asyncHandler(groupController.updateUserRole)
);

/**
 * Xóa người dùng khỏi nhóm.
 * @swagger
 * /api/groups/{groupId}/members:
 *   delete:
 *     tags: [Group]
 *     summary: Xóa người dùng khỏi nhóm
 *     security:
 *       - UserBearer: []
 */
router.delete(
    '/:groupId/members',
    authMiddleware,
    validateMiddleware(groupIdSchema),
    groupRoleMiddleware,
    asyncHandler(groupController.removeUserFromGroup)
);

/**
 * Lấy danh sách thành viên trong nhóm.
 * @swagger
 * /api/groups/{groupId}/members:
 *   get:
 *     tags: [Group]
 *     summary: Lấy danh sách thành viên trong nhóm
 *     security:
 *       - UserBearer: []
 */
router.get(
    '/:groupId/members',
    authMiddleware,
    validateMiddleware(groupIdSchema),
    groupRoleMiddleware,
    asyncHandler(groupController.getUsersInGroup)
);

/**
 * Lấy role của user trong một group cụ thể.
 * @swagger
 * /api/groups/role/{groupId}:
 *   get:
 *     tags:
 *       - Group
 *     summary: Lấy role của user trong group
 *     description: Lấy vai trò của người dùng hiện tại trong một nhóm cụ thể
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         type: string
 *         description: ID của nhóm cần kiểm tra role
 *     responses:
 *       200:
 *         description: Trả về role của user trong group
 *         schema:
 *           type: object
 *           properties:
 *             role:
 *               type: string
 *               enum: [owner, vice, admin, member]
 *               description: Vai trò của user trong group
 */
router.get(
    '/role/:groupId',
    authMiddleware,
    validateMiddleware(groupIdSchema),
    groupController.getUserGroupRole
);

/**
 * Lấy danh sách group mà user là owner.
 * @swagger
 * /api/groups/owned:
 *   get:
 *     tags:
 *       - Group
 *     summary: Lấy danh sách group của user là chủ sở hữu
 *     description: Lấy tất cả các nhóm mà người dùng hiện tại là chủ sở hữu (owner)
 *     security:
 *       - UserBearer: []
 *     responses:
 *       200:
 *         description: Trả về danh sách các group
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/GroupWithRole'
 */
router.get(
    '/owned',
    authMiddleware,
    groupController.getOwnedGroups
);

/**
 * Lấy danh sách group mà user là member (bao gồm vice, admin, member).
 * @swagger
 * /api/groups/member:
 *   get:
 *     tags:
 *       - Group
 *     summary: Lấy danh sách group của user là thành viên
 *     description: Lấy tất cả các nhóm mà người dùng hiện tại là thành viên (vice, admin, member)
 *     security:
 *       - UserBearer: []
 *     responses:
 *       200:
 *         description: Trả về danh sách các group
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/GroupWithRole'
 */
router.get(
    '/member',
    authMiddleware,
    groupController.getMemberGroups
);

export default router;