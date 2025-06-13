// src/controllers/ticket.controller.ts
import { Request, Response, NextFunction } from 'express';
import TicketService from '../services/ticket.service';
import { ErrorCodes, throwError } from '../utils/errors';

class TicketController {
  private ticketService: TicketService;

  constructor() {
    this.ticketService = new TicketService();
  }

  /**
   * Tạo phiếu hỗ trợ mới
   * @param req Request Express với thông tin phiếu hỗ trợ trong body
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
  createTicket = async (req: Request, res: Response, next: NextFunction) => {
    const accountId = req.user?.userId || req.user?.employeeId;
    if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

    const { device_serial, ticket_type_id, description, evidence } = req.body;
    try {
      const ticket = await this.ticketService.createTicket({
        user_id: accountId,
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

  /**
   * Cập nhật thông tin phiếu hỗ trợ
   * @param req Request Express với ID phiếu trong params và thông tin cập nhật trong body
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
  // updateTicket = async (req: Request, res: Response, next: NextFunction) => {
  //   const accountId = req.user?.userId || req.user?.employeeId;
  //   if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

  //   const { ticketId } = req.params;
  //   const { description, evidence, status, assigned_to, resolve_solution } = req.body;
  //   try {
  //     const ticket = await this.ticketService.updateTicketStatus(ticketId, accountId, {
  //       description,
  //       evidence,
  //       status,
  //       assigned_to,
  //       resolve_solution,
  //     });
  //     res.json(ticket);
  //   } catch (error) {
  //     next(error);
  //   }
  // };

  /**
   * Xóa phiếu hỗ trợ
   * @param req Request Express với ID phiếu trong params
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
  deleteTicket = async (req: Request, res: Response, next: NextFunction) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

    const { ticketId } = req.params;
    try {
      await this.ticketService.deleteTicket(ticketId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lấy thông tin phiếu hỗ trợ theo ID
   * @param req Request Express với ID phiếu trong params
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
  getTicketById = async (req: Request, res: Response, next: NextFunction) => {
    const accountId = req.user?.userId || req.user?.employeeId;
    if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

    const { ticketId } = req.params;
    try {
      const ticket = await this.ticketService.getTicketById(ticketId);
      if (ticket.user_id !== accountId && !req.user?.employeeId) {
        throwError(ErrorCodes.FORBIDDEN, 'No permission to access this ticket');
      }
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lấy danh sách phiếu hỗ trợ của người dùng hiện tại
   * @param req Request Express
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
  getTicketsByUser = async (req: Request, res: Response, next: NextFunction) => {
    const accountId = req.user?.userId || req.user?.employeeId;
    if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

    try {
      const tickets = await this.ticketService.getTicketsByUser(accountId);
      res.json(tickets);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lấy tất cả phiếu hỗ trợ với các bộ lọc tùy chọn
   * @param req Request Express với các tham số truy vấn trong query
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
  getAllTickets = async (req: Request, res: Response, next: NextFunction) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

    const { user_id, ticket_type_id, status, created_at_start, created_at_end, resolved_at_start, resolved_at_end, page, limit } = req.query;
    try {
      const tickets = await this.ticketService.getAllTickets({
        user_id: user_id as string,
        ticket_type_id: ticket_type_id ? parseInt(ticket_type_id as string) : undefined,
        status: status as string,
        created_at_start: created_at_start ? new Date(created_at_start as string) : undefined,
        created_at_end: created_at_end ? new Date(created_at_end as string) : undefined,
        resolved_at_start: resolved_at_start ? new Date(resolved_at_start as string) : undefined,
        resolved_at_end: resolved_at_end ? new Date(resolved_at_end as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
      });
      res.json(tickets);
    } catch (error) {
      next(error);
    }
  };
}

export default TicketController;

