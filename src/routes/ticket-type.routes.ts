/**
 * Định nghĩa các route cho quản lý loại vé (Ticket Type).
 * Sử dụng các middleware xác thực, phân quyền, và kiểm tra dữ liệu đầu vào.
 * @swagger
 * tags:
 *  name: Ticket Type
 *  description: Quản lý các loại vé hỗ trợ trong hệ thống
 */

import { Router, Request, Response, NextFunction } from "express";
import TicketTypeController from "../controllers/ticket-type.controller";
import validateMiddleware from "../middleware/validate.middleware";
import authMiddleware from "../middleware/auth.middleware";
import roleMiddleware from "../middleware/role.middleware";
import {
  ticketTypeIdSchema,
  ticketTypeSchema,
  updateTicketTypePrioritySchema,
  updateTicketTypeSchema
} from "../utils/schemas/ticket.schema";

const router = Router();
const ticketTypeController = new TicketTypeController();

/**
 * Hàm wrapper cho các controller bất đồng bộ, tự động bắt lỗi và chuyển cho middleware xử lý lỗi.
 * @param fn Hàm controller bất đồng bộ
 * @returns Middleware Express
 */
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * @swagger
 * /api/ticket-types:
 *   post:
 *     tags:
 *       - Ticket Type
 *     summary: Tạo loại vé mới
 *     description: |
 *       Tạo một loại vé mới trong hệ thống.
 *       Yêu cầu xác thực và quyền quản trị.
 *     security:
 *       - Bearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin loại vé cần tạo
 *         schema:
 *           type: object
 *           required:
 *             - ticket_type_name
 *           properties:
 *             ticket_type_name:
 *               type: string
 *               description: Tên của loại vé (bắt buộc, tối đa 500 ký tự)
 *               example: Vé hỗ trợ kỹ thuật
 *             priority:
 *               type: number
 *               description: Mức độ ưu tiên của loại vé (từ 1-5, mặc định là 1)
 *               example: 3
 *     responses:
 *       200:
 *         description: Tạo loại vé thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền quản trị
 *       500:
 *         description: Lỗi server
 */
/**
 * Tạo loại vé mới
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware,
  validateMiddleware(ticketTypeSchema),
  asyncHandler(ticketTypeController.createTicketType)
);

/**
 * @swagger
 * /api/ticket-types/{ticketTypeId}:
 *   put:
 *     tags:
 *       - Ticket Type
 *     summary: Cập nhật thông tin loại vé
 *     description: |
 *       Cập nhật thông tin cho một loại vé theo ID.
 *       Yêu cầu xác thực và quyền quản trị.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: ticketTypeId
 *         required: true
 *         type: string
 *         description: ID của loại vé cần cập nhật
 *       - in: body
 *         name: body
 *         description: Thông tin cập nhật cho loại vé
 *         schema:
 *           type: object
 *           properties:
 *             ticket_type_name:
 *               type: string
 *               description: Tên mới của loại vé (tối đa 500 ký tự)
 *               example: Vé hỗ trợ kỹ thuật cập nhật
 *     responses:
 *       200:
 *         description: Cập nhật loại vé thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền quản trị
 *       404:
 *         description: Không tìm thấy loại vé
 *       500:
 *         description: Lỗi server
 */
/**
 * Cập nhật thông tin loại vé
 */
router.put(
  "/:ticketTypeId",
  authMiddleware,
  roleMiddleware,
  validateMiddleware(ticketTypeIdSchema),
  validateMiddleware(updateTicketTypeSchema),
  asyncHandler(ticketTypeController.updateTicketType)
);

/**
 * @swagger
 * /api/ticket-types/{ticketTypeId}/priority:
 *   put:
 *     tags:
 *       - Ticket Type
 *     summary: Cập nhật độ ưu tiên của loại vé
 *     description: |
 *       Cập nhật mức độ ưu tiên cho một loại vé.
 *       Yêu cầu xác thực và quyền quản trị.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: ticketTypeId
 *         required: true
 *         type: string
 *         description: ID của loại vé cần cập nhật
 *       - in: body
 *         name: body
 *         description: Thông tin cập nhật độ ưu tiên
 *         schema:
 *           type: object
 *           required:
 *             - priority
 *           properties:
 *             priority:
 *               type: number
 *               description: Mức độ ưu tiên mới (từ 1-5)
 *               example: 4
 *     responses:
 *       200:
 *         description: Cập nhật độ ưu tiên thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền quản trị
 *       404:
 *         description: Không tìm thấy loại vé
 *       500:
 *         description: Lỗi server
 */
/**
 * Cập nhật độ ưu tiên của loại vé
 */
router.put(
  "/:ticketTypeId/priority",
  authMiddleware,
  roleMiddleware,
  validateMiddleware(ticketTypeIdSchema),
  validateMiddleware(updateTicketTypePrioritySchema),
  asyncHandler(ticketTypeController.updateTicketTypePriority)
);

/**
 * @swagger
 * /api/ticket-types/{ticketTypeId}:
 *   delete:
 *     tags:
 *       - Ticket Type
 *     summary: Xóa loại vé
 *     description: |
 *       Xóa một loại vé khỏi hệ thống.
 *       Yêu cầu xác thực và quyền quản trị.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: ticketTypeId
 *         required: true
 *         type: string
 *         description: ID của loại vé cần xóa
 *     responses:
 *       200:
 *         description: Xóa loại vé thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền quản trị
 *       404:
 *         description: Không tìm thấy loại vé
 *       500:
 *         description: Lỗi server
 */
/**
 * Xóa loại vé
 */
router.delete(
  "/:ticketTypeId",
  authMiddleware,
  roleMiddleware,
  validateMiddleware(ticketTypeIdSchema),
  asyncHandler(ticketTypeController.deleteTicketType)
);

/**
 * @swagger
 * /api/ticket-types/{ticketTypeId}:
 *   get:
 *     tags:
 *       - Ticket Type
 *     summary: Lấy thông tin loại vé theo ID
 *     description: Lấy thông tin chi tiết của một loại vé theo ID
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: ticketTypeId
 *         required: true
 *         type: string
 *         description: ID của loại vé cần xem
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết của loại vé
 *         schema:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             ticket_type_name:
 *               type: string
 *             priority:
 *               type: number
 *             created_at:
 *               type: string
 *               format: date-time
 *             updated_at:
 *               type: string
 *               format: date-time
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy loại vé
 *       500:
 *         description: Lỗi server
 */
/**
 * Lấy thông tin loại vé theo ID
 */
router.get(
  "/:ticketTypeId",
  authMiddleware,
  validateMiddleware(ticketTypeIdSchema),
  asyncHandler(ticketTypeController.getTicketTypeById)
);

/**
 * @swagger
 * /api/ticket-types:
 *   get:
 *     tags:
 *       - Ticket Type
 *     summary: Lấy danh sách tất cả loại vé
 *     description: Lấy danh sách tất cả các loại vé trong hệ thống
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Trả về danh sách tất cả các loại vé
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *               ticket_type_name:
 *                 type: string
 *               priority:
 *                 type: number
 *               created_at:
 *                 type: string
 *                 format: date-time
 *               updated_at:
 *                 type: string
 *                 format: date-time
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get(
  "/",
  authMiddleware,
  asyncHandler(ticketTypeController.getAllTicketTypes)
);

export default router;
