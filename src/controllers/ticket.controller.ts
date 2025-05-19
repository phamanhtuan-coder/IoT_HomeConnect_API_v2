import { Request, Response, NextFunction } from "express";
import TicketService from "../services/ticket.service";
import { ErrorCodes, throwError } from "../utils/errors";

class TicketController {
  private ticketService: TicketService;

  constructor() {
    this.ticketService = new TicketService();
  }

  createTicket = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.customerId || req.user?.employeeId;
    if (!userId) {
      throwError(ErrorCodes.UNAUTHORIZED, "User not authenticated");
    }

    const { device_serial, ticket_type_id, description, evidence } = req.body;
    try {
      const ticket = await this.ticketService.createTicket(userId, {
        device_serial,
        ticket_type_id,
        description,
        evidence,
      });
      res.status(201).json(ticket);
    } catch (error) {
      next(error);
    }
  };

  updateTicket = async (req: Request, res: Response, next: NextFunction) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
    }

    const { ticketId } = req.params;
    const { description, evidence, status, assigned_to, resolve_solution } =
      req.body;
    try {
      const ticket = await this.ticketService.updateTicket(parseInt(ticketId), {
        description,
        evidence,
        status,
        assigned_to,
        resolve_solution,
      });
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  };

  deleteTicket = async (req: Request, res: Response, next: NextFunction) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
    }

    const { ticketId } = req.params;
    try {
      await this.ticketService.deleteTicket(parseInt(ticketId));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  getTicketById = async (req: Request, res: Response, next: NextFunction) => {
    const { ticketId } = req.params;
    try {
      const ticket = await this.ticketService.getTicketById(parseInt(ticketId));
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  };

  getAllTickets = async (req: Request, res: Response, next: NextFunction) => {
    const {
      user_id,
      ticket_type_id,
      status,
      created_at_start,
      created_at_end,
      resolved_at_start,
      resolved_at_end,
    } = req.query as any;
    try {
      const tickets = await this.ticketService.getAllTickets({
        user_id,
        ticket_type_id: ticket_type_id ? parseInt(ticket_type_id) : undefined,
        status,
        created_at_start,
        created_at_end,
        resolved_at_start,
        resolved_at_end,
      });
      res.json(tickets);
    } catch (error) {
      next(error);
    }
  };
}

export default TicketController;