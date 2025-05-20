/**
 * Định nghĩa các route cho quản lý loại vé (Ticket Type).
 * Sử dụng các middleware xác thực, phân quyền, và kiểm tra dữ liệu đầu vào.
 *
 * Các endpoint:
 * - POST   /                : Tạo loại vé mới
 * - PUT    /:ticketTypeId   : Cập nhật thông tin loại vé
 * - PUT    /:ticketTypeId/priority : Cập nhật độ ưu tiên của loại vé
 * - DELETE /:ticketTypeId   : Xóa loại vé
 * - GET    /:ticketTypeId   : Lấy thông tin loại vé theo ID
 * - GET    /                : Lấy danh sách tất cả loại vé
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
 * Lấy thông tin loại vé theo ID
 */
router.get(
  "/:ticketTypeId",
  authMiddleware,
  validateMiddleware(ticketTypeIdSchema),
  asyncHandler(ticketTypeController.getTicketTypeById)
);

/**
 * Lấy danh sách tất cả loại vé
 */
router.get(
  "/",
  authMiddleware,
  asyncHandler(ticketTypeController.getAllTicketTypes)
);

export default router;