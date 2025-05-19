import { Router, Request, Response, NextFunction } from "express";
import TicketTypeController from "../controllers/ticket-type.controller";
import validateMiddleware from "../middleware/validate.middleware";
import authMiddleware from "../middleware/auth.middleware";
import roleMiddleware from "../middleware/role.middleware";
import {
  ticketTypeSchema,
  updateTicketTypeSchema,
  updateTicketTypePrioritySchema,
  ticketTypeIdSchema,
} from "../utils/validators";

const router = Router();
const ticketTypeController = new TicketTypeController();

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
  roleMiddleware,
  validateMiddleware(ticketTypeSchema),
  asyncHandler(ticketTypeController.createTicketType)
);

router.put(
  "/:ticketTypeId",
  authMiddleware,
  roleMiddleware,
  validateMiddleware(ticketTypeIdSchema),
  validateMiddleware(updateTicketTypeSchema),
  asyncHandler(ticketTypeController.updateTicketType)
);

router.put(
  "/:ticketTypeId/priority",
  authMiddleware,
  roleMiddleware,
  validateMiddleware(ticketTypeIdSchema),
  validateMiddleware(updateTicketTypePrioritySchema),
  asyncHandler(ticketTypeController.updateTicketTypePriority)
);

router.delete(
  "/:ticketTypeId",
  authMiddleware,
  roleMiddleware,
  validateMiddleware(ticketTypeIdSchema),
  asyncHandler(ticketTypeController.deleteTicketType)
);

router.get(
  "/:ticketTypeId",
  authMiddleware,
  validateMiddleware(ticketTypeIdSchema),
  asyncHandler(ticketTypeController.getTicketTypeById)
);

router.get(
  "/",
  authMiddleware,
  asyncHandler(ticketTypeController.getAllTicketTypes)
);

export default router;