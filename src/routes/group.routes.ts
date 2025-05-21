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
 * @swagger
 * /api/groups:
 *   post:
 *     tags:
 *       - Group
 *     summary: Tạo nhóm mới
 *     description: |
 *       Tạo một nhóm mới trong hệ thống.
 *       Người tạo sẽ tự động trở thành admin của nhóm.
 *     security:
 *       - UserBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin nhóm cần tạo
 *         schema:
 *           type: object
 *           required:
 *             - group_name
 *           properties:
 *             group_name:
 *               type: string
 *               description: Tên của nhóm (1-100 ký tự)
 *               example: "Nhà của tôi"
 *     responses:
 *       201:
 *         description: Tạo nhóm thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
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
 *     tags:
 *       - Group
 *     summary: Lấy thông tin nhóm theo ID
 *     description: |
 *       Lấy thông tin chi tiết của một nhóm, bao gồm danh sách thành viên.
 *       Yêu cầu người dùng phải là thành viên của nhóm.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         type: string
 *         description: ID của nhóm cần xem
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết của nhóm
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: number
 *               description: ID của nhóm
 *             group_name:
 *               type: string
 *               description: Tên nhóm
 *             created_at:
 *               type: string
 *               format: date-time
 *               description: Thời gian tạo nhóm
 *             members:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   user_id:
 *                     type: number
 *                     description: ID của thành viên
 *                   role:
 *                     type: string
 *                     description: Vai trò trong nhóm (ADMIN/MEMBER)
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền truy cập nhóm này
 *       404:
 *         description: Không tìm thấy nhóm
 *       500:
 *         description: Lỗi server
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
 * @swagger
 * /api/groups/{groupId}:
 *   put:
 *     tags:
 *       - Group
 *     summary: Cập nhật tên nhóm
 *     description: |
 *       Cập nhật tên của nhóm.
 *       Yêu cầu quyền ADMIN trong nhóm.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         type: string
 *         description: ID của nhóm cần cập nhật
 *       - in: body
 *         name: body
 *         description: Thông tin cập nhật cho nhóm
 *         schema:
 *           type: object
 *           required:
 *             - group_name
 *           properties:
 *             group_name:
 *               type: string
 *               description: Tên mới của nhóm (1-100 ký tự)
 *               example: "Nhà của tôi - Cập nhật"
 *     responses:
 *       200:
 *         description: Cập nhật tên nhóm thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền ADMIN trong nhóm
 *       404:
 *         description: Không tìm thấy nhóm
 *       500:
 *         description: Lỗi server
 */
router.put(
    '/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(groupSchema),
    asyncHandler(groupController.updateGroupName)
);

/**
 * Xóa nhóm.
 * @swagger
 * /api/groups/{groupId}:
 *   delete:
 *     tags:
 *       - Group
 *     summary: Xóa nhóm
 *     description: |
 *       Xóa một nhóm và tất cả dữ liệu liên quan.
 *       Yêu cầu quyền ADMIN trong nhóm.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         type: string
 *         description: ID của nhóm cần xóa
 *     responses:
 *       200:
 *         description: Xóa nhóm thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền ADMIN trong nhóm
 *       404:
 *         description: Không tìm thấy nhóm
 *       500:
 *         description: Lỗi server
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
 * @swagger
 * /api/groups/users:
 *   post:
 *     tags:
 *       - Group
 *     summary: Thêm người dùng vào nhóm
 *     description: |
 *       Thêm một người dùng mới vào nhóm.
 *       Yêu cầu quyền ADMIN trong nhóm.
 *     security:
 *       - UserBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin thêm người dùng vào nhóm
 *         schema:
 *           type: object
 *           required:
 *             - user_id
 *             - group_id
 *             - role
 *           properties:
 *             user_id:
 *               type: number
 *               description: ID của người dùng cần thêm
 *               example: 1
 *             group_id:
 *               type: number
 *               description: ID của nhóm
 *               example: 1
 *             role:
 *               type: string
 *               enum: [ADMIN, MEMBER]
 *               description: Vai trò trong nhóm
 *               example: "MEMBER"
 *     responses:
 *       201:
 *         description: Thêm người dùng vào nhóm thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền ADMIN trong nhóm
 *       404:
 *         description: Không tìm thấy người dùng hoặc nhóm
 *       409:
 *         description: Người dùng đã là thành viên của nhóm
 *       500:
 *         description: Lỗi server
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
 * @swagger
 * /api/groups/{groupId}/users:
 *   put:
 *     tags:
 *       - Group
 *     summary: Cập nhật vai trò thành viên
 *     description: |
 *       Cập nhật vai trò của một thành viên trong nhóm.
 *       Yêu cầu quyền ADMIN trong nhóm.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         type: string
 *         description: ID của nhóm
 *       - in: body
 *         name: body
 *         description: Thông tin cập nhật vai trò
 *         schema:
 *           type: object
 *           required:
 *             - user_id
 *             - role
 *           properties:
 *             user_id:
 *               type: number
 *               description: ID của thành viên cần cập nhật
 *               example: 1
 *             role:
 *               type: string
 *               enum: [ADMIN, MEMBER]
 *               description: Vai trò mới trong nhóm
 *               example: "ADMIN"
 *     responses:
 *       200:
 *         description: Cập nhật vai trò thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền ADMIN trong nhóm
 *       404:
 *         description: Không tìm thấy thành viên trong nhóm
 *       500:
 *         description: Lỗi server
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
 * @swagger
 * /api/groups/{groupId}/users:
 *   delete:
 *     tags:
 *       - Group
 *     summary: Xóa thành viên khỏi nhóm
 *     description: |
 *       Xóa một thành viên ra khỏi nhóm.
 *       Yêu cầu quyền ADMIN trong nhóm.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         type: string
 *         description: ID của nhóm
 *       - in: body
 *         name: body
 *         description: Thông tin thành viên cần xóa
 *         schema:
 *           type: object
 *           required:
 *             - user_id
 *           properties:
 *             user_id:
 *               type: number
 *               description: ID của thành viên cần xóa
 *               example: 1
 *     responses:
 *       200:
 *         description: Xóa thành viên thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền ADMIN trong nhóm
 *       404:
 *         description: Không tìm thấy thành viên trong nhóm
 *       500:
 *         description: Lỗi server
 */
router.delete(
    '/:groupId/users',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(updateGroupRoleSchema),
    asyncHandler(groupController.removeUserFromGroup)
);

export default router;

