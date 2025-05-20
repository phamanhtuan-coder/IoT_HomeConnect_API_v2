import { Router, Request, Response, NextFunction } from 'express';
import TicketController from '../controllers/ticket.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import { ticketSchema, updateTicketSchema, ticketIdSchema, ticketFilterSchema } from '../utils/validators';

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
 * Tạo ticket mới.
 * Yêu cầu xác thực và validate dữ liệu đầu vào.
 */
router.post(
    '/',
    authMiddleware,
    validateMiddleware(ticketSchema),
    asyncHandler(ticketController.createTicket)
);

/**
 * Cập nhật ticket theo ID.
 * Yêu cầu xác thực, validate ID và dữ liệu cập nhật.
 */
router.put(
    '/:ticketId',
    authMiddleware,
    validateMiddleware(ticketIdSchema),
    validateMiddleware(updateTicketSchema),
    asyncHandler(ticketController.updateTicket)
);

/**
 * Xóa ticket theo ID.
 * Yêu cầu xác thực, kiểm tra quyền và validate ID.
 */
router.delete(
    '/:ticketId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(ticketIdSchema),
    asyncHandler(ticketController.deleteTicket)
);

/**
 * Lấy thông tin ticket theo ID.
 * Yêu cầu xác thực và validate ID.
 */
router.get(
    '/:ticketId',
    authMiddleware,
    validateMiddleware(ticketIdSchema),
    asyncHandler(ticketController.getTicketById)
);

/**
 * Lấy danh sách ticket của người dùng hiện tại.
 * Yêu cầu xác thực.
 */
router.get(
    '/user',
    authMiddleware,
    asyncHandler(ticketController.getTicketsByUser)
);

/**
 * Lấy tất cả ticket với filter.
 * Yêu cầu xác thực, kiểm tra quyền và validate filter.
 */
router.get(
    '/',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(ticketFilterSchema),
    asyncHandler(ticketController.getAllTickets)
);

export default router;