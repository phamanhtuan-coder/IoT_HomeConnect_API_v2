/**
 * Định nghĩa các route cho quản lý không gian (Space).
 * @swagger
 * tags:
 *  name: Space
 *  description: Quản lý các không gian trong nhà
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
import spaceGroupMiddleware from '../middleware/space-group.middleware';
import {spaceIdSchema,  createSpaceSchema, updateSpaceSchema} from "../utils/schemas/space.schema";

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
 * @swagger
 * /api/spaces:
 *   post:
 *     tags:
 *       - Space
 *     summary: Tạo không gian mới
 *     description: |
 *       Tạo một không gian mới trong ngôi nhà.
 *       Yêu cầu người dùng có quyền trong nhóm chứa nhà.
 *     security:
 *       - UserBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin không gian cần tạo
 *         schema:
 *           type: object
 *           required:
 *             - space_name
 *             - house_id
 *           properties:
 *             space_name:
 *               type: string
 *               description: Tên của không gian (tối đa 100 ký tự)
 *               example: "Phòng khách"
 *             house_id:
 *               type: number
 *               description: ID của ngôi nhà chứa không gian
 *               example: 1
 *     responses:
 *       201:
 *         description: Tạo không gian thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền trong nhóm
 *       404:
 *         description: Không tìm thấy ngôi nhà
 *       500:
 *         description: Lỗi server
 */
router.post(
    '/',
    authMiddleware,
    validateMiddleware(createSpaceSchema),
    spaceGroupMiddleware,
    groupRoleMiddleware,
    asyncHandler(spaceController.createSpace)
);

/**
 * Lấy danh sách các Space theo House.
 * @swagger
 * /api/spaces/house/{houseId}:
 *   get:
 *     tags:
 *       - Space
 *     summary: Lấy danh sách không gian theo nhà
 *     description: |
 *       Lấy danh sách tất cả các không gian trong một ngôi nhà.
 *       Yêu cầu người dùng có quyền trong nhóm chứa nhà.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: houseId
 *         required: true
 *         type: string
 *         description: ID của ngôi nhà cần lấy danh sách không gian
 *     responses:
 *       200:
 *         description: Trả về danh sách các không gian
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: number
 *                 description: ID của không gian
 *               space_name:
 *                 type: string
 *                 description: Tên không gian
 *               house_id:
 *                 type: number
 *                 description: ID của nhà chứa không gian
 *               created_at:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian tạo
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền trong nhóm
 *       404:
 *         description: Không tìm thấy ngôi nhà
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/house/:houseId',
    authMiddleware,
    spaceGroupMiddleware,
    groupRoleMiddleware,
    asyncHandler(spaceController.getSpacesByHouse)
);

/**
 * Lấy tên của một Space.
 * @swagger
 * /api/spaces/{spaceId}/name:
 *   get:
 *     tags:
 *       - Space
 *     summary: Lấy tên không gian
 *     description: |
 *       Lấy tên của một không gian theo ID.
 *       Yêu cầu người dùng có quyền trong nhóm chứa nhà.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         type: string
 *         description: ID của không gian cần lấy tên
 *     responses:
 *       200:
 *         description: Trả về tên của không gian
 *         schema:
 *           type: object
 *           properties:
 *             space_name:
 *               type: string
 *               description: Tên của không gian
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền trong nhóm
 *       404:
 *         description: Không tìm thấy không gian
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/:spaceId/name',
    authMiddleware,
    validateMiddleware(spaceIdSchema),
    spaceGroupMiddleware,
    groupRoleMiddleware,
    asyncHandler(spaceController.getSpaceName)
);

/**
 * Lấy thông tin chi tiết một Space.
 * @swagger
 * /api/spaces/{spaceId}:
 *   get:
 *     tags:
 *       - Space
 *     summary: Lấy thông tin không gian theo ID
 *     description: |
 *       Lấy thông tin chi tiết của một không gian.
 *       Yêu cầu người dùng có quyền trong nhóm chứa nhà.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         type: string
 *         description: ID của không gian cần xem
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết của không gian
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: number
 *               description: ID của không gian
 *             space_name:
 *               type: string
 *               description: Tên không gian
 *             house_id:
 *               type: number
 *               description: ID của nhà chứa không gian
 *             created_at:
 *               type: string
 *               format: date-time
 *               description: Thời gian tạo
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền trong nhóm
 *       404:
 *         description: Không tìm thấy không gian
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/:spaceId',
    authMiddleware,
    validateMiddleware(spaceIdSchema),
    spaceGroupMiddleware,
    groupRoleMiddleware,
    asyncHandler(spaceController.getSpaceById)
);

/**
 * Cập nhật thông tin một Space.
 * @swagger
 * /api/spaces/{spaceId}:
 *   put:
 *     tags:
 *       - Space
 *     summary: Cập nhật thông tin không gian
 *     description: |
 *       Cập nhật thông tin của một không gian.
 *       Yêu cầu người dùng có quyền trong nhóm chứa nhà.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         type: string
 *         description: ID của không gian cần cập nhật
 *       - in: body
 *         name: body
 *         description: Thông tin cập nhật cho không gian
 *         schema:
 *           type: object
 *           required:
 *             - space_name
 *           properties:
 *             space_name:
 *               type: string
 *               description: Tên mới của không gian (tối đa 100 ký tự)
 *               example: "Phòng khách - Cập nhật"
 *     responses:
 *       200:
 *         description: Cập nhật thông tin không gian thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền trong nhóm
 *       404:
 *         description: Không tìm thấy không gian
 *       500:
 *         description: Lỗi server
 */
router.put(
    '/:spaceId',
    authMiddleware,
    validateMiddleware(updateSpaceSchema),
    spaceGroupMiddleware,
    groupRoleMiddleware,
    asyncHandler(spaceController.updateSpace)
);

/**
 * Xoá một Space.
 * @swagger
 * /api/spaces/{spaceId}:
 *   delete:
 *     tags:
 *       - Space
 *     summary: Xóa không gian
 *     description: |
 *       Xóa một không gian và tất cả thiết bị trong không gian đó.
 *       Yêu cầu người dùng có quyền trong nhóm chứa nhà.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         type: string
 *         description: ID của không gian cần xóa
 *     responses:
 *       200:
 *         description: Xóa không gian thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền trong nhóm
 *       404:
 *         description: Không tìm thấy không gian
 *       500:
 *         description: Lỗi server
 */
router.delete(
    '/:spaceId',
    authMiddleware,
    validateMiddleware(spaceIdSchema),
    spaceGroupMiddleware,
    groupRoleMiddleware,
    asyncHandler(spaceController.deleteSpace)
);

export default router;
