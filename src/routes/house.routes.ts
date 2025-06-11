/**
 * Định nghĩa các route cho tài nguyên House.
 * @swagger
 * tags:
 *  name: House
 *  description: Quản lý các ngôi nhà trong hệ thống
 *
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
import houseGroupMiddleware from '../middleware/house-group.middleware';
import {houseIdSchema, houseSchema} from "../utils/schemas/house.schema";

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
 * @swagger
 * /api/houses:
 *   post:
 *     tags:
 *       - House
 *     summary: Tạo ngôi nhà mới
 *     description: |
 *       Tạo một ngôi nhà mới trong nhóm.
 *       Yêu cầu người dùng có quyền trong nhóm.
 *     security:
 *       - UserBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin ngôi nhà cần tạo
 *         schema:
 *           type: object
 *           required:
 *             - house_name
 *             - group_id
 *           properties:
 *             house_name:
 *               type: string
 *               description: Tên của ngôi nhà (tối đa 100 ký tự)
 *               example: "Nhà ở Hà Nội"
 *             group_id:
 *               type: number
 *               description: ID của nhóm chứa nhà
 *               example: 1
 *     responses:
 *       201:
 *         description: Tạo ngôi nhà thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền trong nhóm
 *       500:
 *         description: Lỗi server
 */
router.post(
    '/',
    authMiddleware,
    validateMiddleware(houseSchema),
    houseGroupMiddleware,
    groupRoleMiddleware,
    asyncHandler(houseController.createHouse)
);



/**
 * Cập nhật thông tin house theo houseId.
 * @swagger
 * /api/houses/{houseId}:
 *   put:
 *     tags:
 *       - House
 *     summary: Cập nhật thông tin nhà
 *     description: |
 *       Cập nhật thông tin của một ngôi nhà.
 *       Yêu cầu người dùng có quyền trong nhóm chứa nhà.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: houseId
 *         required: true
 *         type: string
 *         description: ID của ngôi nhà cần cập nhật
 *       - in: body
 *         name: body
 *         description: Thông tin cập nhật cho ngôi nhà
 *         schema:
 *           type: object
 *           required:
 *             - house_name
 *           properties:
 *             house_name:
 *               type: string
 *               description: Tên mới của ngôi nhà (tối đa 100 ký tự)
 *               example: "Nhà ở Hà Nội - Cập nhật"
 *     responses:
 *       200:
 *         description: Cập nhật thông tin nhà thành công
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
router.put(
    '/:houseId',
    authMiddleware,
    validateMiddleware(houseSchema),
    houseGroupMiddleware,
    groupRoleMiddleware,
    asyncHandler(houseController.updateHouse)
);

/**
 * Lấy thông tin house theo houseId.
 * @swagger
 * /api/houses/{houseId}:
 *   get:
 *     tags:
 *       - House
 *     summary: Lấy thông tin nhà theo ID
 *     description: |
 *       Lấy thông tin chi tiết của một ngôi nhà.
 *       Yêu cầu người dùng có quyền trong nhóm chứa nhà.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: houseId
 *         required: true
 *         type: string
 *         description: ID của ngôi nhà cần xem
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết của ngôi nhà
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: number
 *               description: ID của ngôi nhà
 *             house_name:
 *               type: string
 *               description: Tên ngôi nhà
 *             group_id:
 *               type: number
 *               description: ID của nhóm chứa nhà
 *             created_at:
 *               type: string
 *               format: date-time
 *               description: Thời gian tạo
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
    '/:houseId',
    authMiddleware,
    validateMiddleware(houseIdSchema),
    houseGroupMiddleware,
    groupRoleMiddleware,
    asyncHandler(houseController.getHouseById)
);

/**
 * Xoá house theo houseId.
 * @swagger
 * /api/houses/{houseId}:
 *   delete:
 *     tags:
 *       - House
 *     summary: Xóa nhà
 *     description: |
 *       Xóa một ngôi nhà và tất cả không gian, thiết bị liên quan.
 *       Yêu cầu người dùng có quyền trong nhóm chứa nhà.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: houseId
 *         required: true
 *         type: string
 *         description: ID của ngôi nhà cần xóa
 *     responses:
 *       200:
 *         description: Xóa ngôi nhà thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền trong nhóm
 *       404:
 *         description: Không tìm thấy ngôi nhà
 *       500:
 *         description: Lỗi server
 */
router.delete(
    '/:houseId',
    authMiddleware,
    validateMiddleware(houseIdSchema),
    houseGroupMiddleware,
    groupRoleMiddleware,
    asyncHandler(houseController.deleteHouse)
);

/**
 * Lấy danh sách house theo groupId.
 * @swagger
 * /api/houses/group/{groupId}:
 *   get:
 *     tags:
 *       - House
 *     summary: Lấy danh sách nhà theo nhóm
 *     description: |
 *       Lấy danh sách tất cả các ngôi nhà trong một nhóm.
 *       Yêu cầu người dùng có quyền trong nhóm.
 *     security:
 *       - UserBearer: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         type: string
 *         description: ID của nhóm cần lấy danh sách nhà
 *     responses:
 *       200:
 *         description: Trả về danh sách các ngôi nhà
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: number
 *                 description: ID của ngôi nhà
 *               house_name:
 *                 type: string
 *                 description: Tên ngôi nhà
 *               group_id:
 *                 type: number
 *                 description: ID của nhóm chứa nhà
 *               created_at:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian tạo
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền trong nhóm
 *       404:
 *         description: Không tìm thấy nhóm
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/group/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(houseController.getHousesByGroup)
);


export default router;
