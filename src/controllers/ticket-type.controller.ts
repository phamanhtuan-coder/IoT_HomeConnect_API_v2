import { Request, Response, NextFunction } from "express";
import TicketTypeService from "../services/ticket-type.service";
import { ErrorCodes, throwError } from "../utils/errors";

class TicketTypeController {
  private ticketTypeService: TicketTypeService;

  constructor() {
    this.ticketTypeService = new TicketTypeService();
  }

  createTicketType = async (req: Request, res: Response, next: NextFunction) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
    }

    const { type_name, priority, is_active } = req.body;
    try {
      const ticketType = await this.ticketTypeService.createTicketType({
        type_name,
        priority,
        is_active,
      });
      res.status(201).json(ticketType);
    } catch (error) {
      next(error);
    }
  };

  updateTicketType = async (req: Request, res: Response, next: NextFunction) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
    }

    const { ticketTypeId } = req.params;
    const { type_name, priority, is_active } = req.body;
    try {
      const ticketType = await this.ticketTypeService.updateTicketType(
        parseInt(ticketTypeId),
        { type_name, priority, is_active }
      );
      res.json(ticketType);
    } catch (error) {
      next(error);
    }
  };

  updateTicketTypePriority = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
    }

    const { ticketTypeId } = req.params;
    const { priority } = req.body;
    try {
      const ticketType = await this.ticketTypeService.updateTicketTypePriority(
        parseInt(ticketTypeId),
        priority
      );
      res.json(ticketType);
    } catch (error) {
      next(error);
    }
  };

  deleteTicketType = async (req: Request, res: Response, next: NextFunction) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
    }

    const { ticketTypeId } = req.params;
    try {
      await this.ticketTypeService.deleteTicketType(parseInt(ticketTypeId));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  getTicketTypeById = async (req: Request, res: Response, next: NextFunction) => {
    const { ticketTypeId } = req.params;
    try {
      const ticketType = await this.ticketTypeService.getTicketTypeById(
        parseInt(ticketTypeId)
      );
      res.json(ticketType);
    } catch (error) {
      next(error);
    }
  };

  getAllTicketTypes = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const ticketTypes = await this.ticketTypeService.getAllTicketTypes();
      res.json(ticketTypes);
    } catch (error) {
      next(error);
    }
  };
}

export default TicketTypeController;