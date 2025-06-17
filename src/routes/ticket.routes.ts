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
 *             - ticket_type_id
 *           properties:
 *             device_serial:
 *               type: string
 *               description: Serial number của thiết bị
 *               example: "DEVICE001"
 *             ticket_type_id:
 *               type: number
 *               description: ID của loại vé hỗ trợ
 *               example: 1
 *             description:
 *               type: string
 *               description: Mô tả chi tiết vấn đề
 *               example: "Thiết bị không phản hồi sau khi khởi động lại"
 *             evidence:
 *               type: object
 *               description: Bằng chứng vấn đề
 *             assigned_to:
 *               type: string
 *               description: ID người được gán
 *             permission_type:
 *               type: string
 *               description: Loại quyền chia sẻ
 *     responses:
 *       201:
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
 * /api/tickets/{ticketId}/confirm:
 *   put:
 *     tags:
 *       - Ticket
 *     summary: Nhân viên xác nhận xử lý vấn đề
 *     description: |
 *       Nhân viên xác nhận sẽ xử lý vấn đề.
 *       Yêu cầu xác thực và quyền nhân viên.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         type: string
 *         description: ID của vé hỗ trợ cần xác nhận
 *     responses:
 *       200:
 *         description: Xác nhận xử lý vấn đề thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền xác nhận vấn đề
 *       404:
 *         description: Không tìm thấy vé hỗ trợ
 *       500:
 *         description: Lỗi server
 */
router.put(
  '/:ticketId/confirm',
  authMiddleware,
  roleMiddleware,
  validateMiddleware(ticketIdSchema),
  asyncHandler(ticketController.confirmTicket)
);

/**
 * @swagger
 * /api/tickets/{ticketId}/status:
 *   put:
 *     tags:
 *       - Ticket
 *     summary: Nhân viên cập nhật trạng thái vấn đề
 *     description: |
 *       Nhân viên cập nhật trạng thái và giải pháp cho vấn đề.
 *       Yêu cầu xác thực và quyền nhân viên.
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
 *             - status
 *             - resolve_solution
 *           properties:
 *             status:
 *               type: string
 *               enum: [resolved, rejected]
 *               description: Trạng thái mới của vấn đề
 *             resolve_solution:
 *               type: string
 *               description: Giải pháp xử lý vấn đề
 *             evidence:
 *               type: object
 *               description: Bằng chứng xử lý
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái vấn đề thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền cập nhật vấn đề
 *       404:
 *         description: Không tìm thấy vé hỗ trợ
 *       500:
 *         description: Lỗi server
 */
router.put(
  '/:ticketId/status',
  authMiddleware,
  roleMiddleware,
  validateMiddleware(ticketIdSchema),
  validateMiddleware(updateTicketSchema),
  asyncHandler(ticketController.updateTicketStatus)
);

/**
 * @swagger
 * /api/tickets/{ticketId}/cancel:
 *   put:
 *     tags:
 *       - Ticket
 *     summary: Khách hàng hủy vấn đề
 *     description: |
 *       Khách hàng hủy vấn đề của mình.
 *       Yêu cầu xác thực.
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         type: string
 *         description: ID của vé hỗ trợ cần hủy
 *     responses:
 *       200:
 *         description: Hủy vấn đề thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền hủy vấn đề này
 *       404:
 *         description: Không tìm thấy vé hỗ trợ
 *       500:
 *         description: Lỗi server
 */
router.put(
  '/:ticketId/cancel',
  authMiddleware,
  validateMiddleware(ticketIdSchema),
  asyncHandler(ticketController.customerCancelTicket)
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
 *       204:
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
  '/detail/:ticketId',
  // authMiddleware,
  // validateMiddleware(ticketIdSchema),
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
 *         name: user_id
 *         required: false
 *         type: string
 *         description: ID người dùng
 *       - in: query
 *         name: ticket_type_id
 *         required: false
 *         type: number
 *         description: ID loại vé hỗ trợ
 *       - in: query
 *         name: status
 *         required: false
 *         type: string
 *         enum: [pending, in_progress, approved, rejected, resolved]
 *         description: Trạng thái vé hỗ trợ
 *       - in: query
 *         name: created_at_start
 *         required: false
 *         type: string
 *         format: date-time
 *         description: Thời gian bắt đầu tạo
 *       - in: query
 *         name: created_at_end
 *         required: false
 *         type: string
 *         format: date-time
 *         description: Thời gian kết thúc tạo
 *       - in: query
 *         name: resolved_at_start
 *         required: false
 *         type: string
 *         format: date-time
 *         description: Thời gian bắt đầu giải quyết
 *       - in: query
 *         name: resolved_at_end
 *         required: false
 *         type: string
 *         format: date-time
 *         description: Thời gian kết thúc giải quyết
 *       - in: query
 *         name: page
 *         required: false
 *         type: number
 *         description: Trang hiện tại
 *       - in: query
 *         name: limit
 *         required: false
 *         type: number
 *         description: Số lượng item trên mỗi trang
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
  // authMiddleware,
  // roleMiddleware,
  validateMiddleware(ticketFilterSchema),
  asyncHandler(ticketController.getAllTickets)
);

export default router;