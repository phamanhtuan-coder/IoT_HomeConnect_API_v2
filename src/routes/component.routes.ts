/**
 * Định nghĩa các route cho thao tác với linh kiện (component).
 * Sử dụng các middleware xác thực, phân quyền và kiểm tra dữ liệu đầu vào.
 * Chỉ nhân viên (employee) được truy cập.
 * @swagger
 * tags:
 *  name: Component
 *  description: Quản lý linh kiện trong hệ thống
 */

import { Router, Request, Response, NextFunction } from 'express';
import ComponentController from '../controllers/component.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import { componentSchema, componentIdSchema, updateComponentSchema } from '../utils/schemas/component.schema';

const router = Router();
const componentController = new ComponentController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * @swagger
 * /api/components:
 *   post:
 *     tags:
 *       - Component
 *     summary: Tạo linh kiện mới
 *     description: Tạo một linh kiện mới trong hệ thống. Yêu cầu quyền nhân viên.
 *     security:
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin linh kiện cần tạo
 *         schema:
 *           type: object
 *           required:
 *             - name
 *           properties:
 *             name:
 *               type: string
 *               description: Tên linh kiện
 *               example: "Chip XYZ"
 *             supplier:
 *               type: string
 *               description: Nhà cung cấp
 *               example: "Supplier ABC"
 *             quantity_in_stock:
 *               type: number
 *               description: Số lượng tồn kho
 *               example: 100
 *             unit_cost:
 *               type: number
 *               description: Giá nhập đơn vị
 *               example: 10.50
 *     responses:
 *       201:
 *         description: Tạo linh kiện thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền (yêu cầu quyền nhân viên)
 *       409:
 *         description: Linh kiện với tên này đã tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post(
    '/',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(componentSchema),
    asyncHandler(componentController.createComponent)
);

/**
 * @swagger
 * /api/components/{componentId}:
 *   get:
 *     tags:
 *       - Component
 *     summary: Lấy thông tin linh kiện theo ID
 *     description: Lấy thông tin chi tiết của linh kiện theo ID. Yêu cầu quyền nhân viên.
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: componentId
 *         required: true
 *         type: string
 *         description: ID của linh kiện
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết của linh kiện
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền (yêu cầu quyền nhân viên)
 *       404:
 *         description: Không tìm thấy linh kiện
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/:componentId',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(componentIdSchema),
    asyncHandler(componentController.getComponentById)
);

/**
 * @swagger
 * /api/components:
 *   get:
 *     tags:
 *       - Component
 *     summary: Lấy danh sách tất cả linh kiện
 *     description: Lấy danh sách tất cả linh kiện trong hệ thống. Yêu cầu quyền nhân viên.
 *     security:
 *       - EmployeeBearer: []
 *     responses:
 *       200:
 *         description: Trả về danh sách linh kiện
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền (yêu cầu quyền nhân viên)
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/',
    authMiddleware,
    // roleMiddleware,
    asyncHandler(componentController.getAllComponents)
);

/**
 * @swagger
 * /api/components/{componentId}:
 *   put:
 *     tags:
 *       - Component
 *     summary: Cập nhật thông tin linh kiện
 *     description: Cập nhật thông tin của linh kiện theo ID. Yêu cầu quyền nhân viên.
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: componentId
 *         required: true
 *         type: string
 *         description: ID của linh kiện cần cập nhật
 *       - in: body
 *         name: body
 *         description: Thông tin linh kiện cần cập nhật
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: Tên linh kiện
 *               example: "Chip XYZ Updated"
 *             supplier:
 *               type: string
 *               description: Nhà cung cấp
 *               example: "Supplier DEF"
 *             quantity_in_stock:
 *               type: number
 *               description: Số lượng tồn kho
 *               example: 150
 *             unit_cost:
 *               type: number
 *               description: Giá nhập đơn vị
 *               example: 12.75
 *     responses:
 *       200:
 *         description: Cập nhật linh kiện thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền (yêu cầu quyền nhân viên)
 *       404:
 *         description: Không tìm thấy linh kiện
 *       409:
 *         description: Linh kiện với tên này đã tồn tại
 *       500:
 *         description: Lỗi server
 */
router.put(
    '/:componentId',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(componentIdSchema),
    validateMiddleware(updateComponentSchema),
    asyncHandler(componentController.updateComponent)
);

/**
 * @swagger
 * /api/components/{componentId}:
 *   delete:
 *     tags:
 *       - Component
 *     summary: Xóa linh kiện
 *     description: Xóa mềm linh kiện theo ID. Yêu cầu quyền nhân viên.
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: componentId
 *         required: true
 *         type: string
 *         description: ID của linh kiện cần xóa
 *     responses:
 *       204:
 *         description: Xóa linh kiện thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền (yêu cầu quyền nhân viên)
 *       404:
 *         description: Không tìm thấy linh kiện
 *       500:
 *         description: Lỗi server
 */
router.delete(
    '/:componentId',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(componentIdSchema),
    asyncHandler(componentController.deleteComponent)
);

export default router;