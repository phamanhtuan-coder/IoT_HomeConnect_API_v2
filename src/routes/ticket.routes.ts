import { Router, Request, Response, NextFunction } from "express";
import TicketController from "../controllers/ticket.controller";
import validateMiddleware from "../middleware/validate.middleware";
import authMiddleware from "../middleware/auth.middleware";
import roleMiddleware from "../middleware/role.middleware";
import {
  ticketSchema,
  updateTicketSchema,
  ticketIdSchema,
  ticketFilterSchema,
} from "../utils/validators";

const router = Router();
const ticketController = new TicketController();

const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

router.post(
  "/",
  authMiddleware,
  validateMiddleware(ticketSchema),
  asyncHandler(ticketController.createTicket)
);

router.put(
  "/:ticketId",
  authMiddleware,
  roleMiddleware,
  validateMiddleware(ticketIdSchema),
  validateMiddleware(updateTicketSchema),
  asyncHandler(ticketController.updateTicket)
);

router.delete(
  "/:ticketId",
  authMiddleware,
  roleMiddleware,
  validateMiddleware(ticketIdSchema),
  asyncHandler(ticketController.deleteTicket)
);

router.get(
  "/:ticketId",
  authMiddleware,
  validateMiddleware(ticketIdSchema),
  asyncHandler(ticketController.getTicketById)
);

router.get(
  "/",
  authMiddleware,
  validateMiddleware(ticketFilterSchema),
  asyncHandler(ticketController.getAllTickets)
);

export default router;