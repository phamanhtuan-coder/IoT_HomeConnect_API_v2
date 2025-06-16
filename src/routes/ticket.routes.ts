/**
 * Định nghĩa các route cho quản lý vé hỗ trợ (Ticket).
 * @swagger
 * tags:
 *  name: Ticket
 *  description: Quản lý các vé hỗ trợ trong hệ thống
 */

import { Router, Request, Response, NextFunction } from 'express';
import TicketController from '../controllers/ticket.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import { ticketFilterSchema, ticketIdSchema, ticketSchema, updateTicketSchema } from "../utils/schemas/ticket.schema";

/**
 * Router cho các route liên quan đến ticket.
 */
const router = Router();
const ticketController = new TicketController();

/**
 * Hàm helper để xử lý các hàm async, tự động bắt lỗi và chuyển tới middleware xử lý lỗi.
 * @param fn Hàm async nhận vào (req, res, next)
 * @returns Middleware Express
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     tags:
 *       - Ticket
 *     summary: Tạo vé hỗ trợ mới
 *     description: |
 *       Tạo một vé hỗ trợ mới trong hệ thống.
 *       Yêu cầu xác thực.
 *     security:
 *       - Bearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin vé hỗ trợ cần tạo
 *         schema:
 *           type: object
 *           required:
 *             - title
 *             - description
 *             - ticket_type_id
 *             - device_id
 *           properties:
 *             title:
 *               type: string
 *               description: Tiêu đề của vé hỗ trợ
 *               example: Thiết bị không hoạt động
 *             description:
 *               type: string
 *               description: Mô tả chi tiết vấn đề
 *               example: Thiết bị không phản hồi sau khi khởi động lại
 *             ticket_type_id:
 *               type: string
 *               description: ID của loại vé hỗ trợ
 *             device_id:
 *               type: string
 *               description: ID của thiết bị gặp vấn đề
 *     responses:
 *       200:
 *         description: Tạo vé hỗ trợ thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy loại vé hoặc thiết bị
 *       500:
 *         description: Lỗi server
 */
router.post(
  '/',
  authMiddleware,
  validateMiddleware(ticketSchema),
  asyncHandler(ticketController.createTicket)
);

/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   put:
 *     tags:
 *       - Ticket
 *     summary: Cập nhật ticket theo ID
 *     description: |
 *       Cập nhật thông tin của một vé hỗ trợ theo ID.
 *       Yêu cầu xác thực và quyền thích hợp.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         type: string
 *         description: ID của vé hỗ trợ cần cập nhật
 *       - in: body
 *         name: body
 *         description: Thông tin cần cập nhật
 *         schema:
 *           type: object
 *           required:
 *             - title
 *             - description
 *           properties:
 *             title:
 *               type: string
 *               description: Tiêu đề của vé hỗ trợ
 *             description:
 *               type: string
 *               description: Mô tả chi tiết vấn đề
 *     responses:
 *       200:
 *         description: Cập nhật vé hỗ trợ thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy vé hỗ trợ
 *       500:
 *         description: Lỗi server
 */
router.put(
  '/:ticketId',
  authMiddleware,
  validateMiddleware(ticketIdSchema),
  validateMiddleware(updateTicketSchema),
  // asyncHandler(ticketController.updateTicket)
);

/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   delete:
 *     tags:
 *       - Ticket
 *     summary: Xóa ticket theo ID
 *     description: |
 *       Xóa một vé hỗ trợ theo ID.
 *       Yêu cầu xác thực và quyền thích hợp.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         type: string
 *         description: ID của vé hỗ trợ cần xóa
 *     responses:
 *       200:
 *         description: Xóa vé hỗ trợ thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy vé hỗ trợ
 *       500:
 *         description: Lỗi server
 */
router.delete(
  '/:ticketId',
  authMiddleware,
  roleMiddleware,
  validateMiddleware(ticketIdSchema),
  asyncHandler(ticketController.deleteTicket)
);

/**
 * @swagger
 * /api/tickets/{ticketId}:
 *   get:
 *     tags:
 *       - Ticket
 *     summary: Lấy thông tin ticket theo ID
 *     description: |
 *       Lấy thông tin chi tiết của một vé hỗ trợ theo ID.
 *       Yêu cầu xác thực và quyền thích hợp.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         type: string
 *         description: ID của vé hỗ trợ cần lấy thông tin
 *     responses:
 *       200:
 *         description: Lấy thông tin vé hỗ trợ thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy vé hỗ trợ
 *       500:
 *         description: Lỗi server
 */
router.get(
  'details/:ticketId',
  authMiddleware,
  validateMiddleware(ticketIdSchema),
  asyncHandler(ticketController.getTicketById)
);

/**
 * @swagger
 * /api/tickets/user:
 *   get:
 *     tags:
 *       - Ticket
 *     summary: Lấy danh sách ticket của người dùng hiện tại
 *     description: |
 *       Lấy danh sách tất cả vé hỗ trợ của người dùng hiện tại.
 *       Yêu cầu xác thực.
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: Lấy danh sách vé hỗ trợ thành công
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get(
  '/user',
  authMiddleware,
  asyncHandler(ticketController.getTicketsByUser)
);

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     tags:
 *       - Ticket
 *     summary: Lấy tất cả ticket với filter
 *     description: |
 *       Lấy danh sách tất cả vé hỗ trợ trong hệ thống với các bộ lọc.
 *       Yêu cầu xác thực và quyền thích hợp.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         required: false
 *         type: string
 *         description: Bộ lọc cho danh sách vé hỗ trợ
 *     responses:
 *       200:
 *         description: Lấy danh sách vé hỗ trợ thành công
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get(
  '/',
  authMiddleware,
  roleMiddleware,
  asyncHandler(ticketController.getAllTickets)
);

export default router;

