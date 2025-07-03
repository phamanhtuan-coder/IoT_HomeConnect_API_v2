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

    const { device_serial, ticket_type_id, description, evidence, assigned_to, permission_type } = req.body;
    try {
      const ticket = await this.ticketService.createTicket({
        user_id: accountId,
        device_serial,
        ticket_type_id,
        description,
        evidence,
        assigned_to,
        permission_type,
      });
      res.status(201).json(ticket);
    } catch (error) {
      console.log(error)
      next(error);
    }
  };

  /**
   * Nhân viên xác nhận xử lý vấn đề
   * @param req Request Express với ID phiếu trong params
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
  confirmTicket = async (req: Request, res: Response, next: NextFunction) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

    const { ticketId } = req.params;
    try {
      const ticket = await this.ticketService.confirmTicket(ticketId, employeeId);
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Nhân viên cập nhật trạng thái vấn đề
   * @param req Request Express với ID phiếu trong params và thông tin cập nhật trong body
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
  updateTicketStatus = async (req: Request, res: Response, next: NextFunction) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

    const { ticketId } = req.params;
    const { status, resolve_solution } = req.body;
    try {
      const ticket = await this.ticketService.updateTicketStatus(ticketId, employeeId, {
        status,
        resolve_solution,
      });
      res.json(ticket);
    } catch (error) {
      next(error);
    }
  };

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
    // const accountId = req.user?.userId || req.user?.employeeId;
    // if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

    const { ticketId } = req.params;
    try {
      const ticket = await this.ticketService.getTicketById(ticketId);
      // if (ticket.user_id !== accountId && !req.user?.employeeId) {
      //   throwError(ErrorCodes.FORBIDDEN, 'No permission to access this ticket');
      // }
      res.status(200).json(ticket);
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
      res.status(200).json(tickets);
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
    // const employeeId = req.user?.employeeId;
    // if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

    const { filters, page, limit } = req.query;
    try {
      console.log('============')
      const tickets = await this.ticketService.getAllTickets(
        filters,
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 10
      );
      res.status(200).json(tickets);
    } catch (error) {
      console.log(error)
      next(error);
    }
  };

  /**
   * Khách hàng hủy vấn đề
   * @param req Request Express với ID phiếu trong params
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
  customerCancelTicket = async (req: Request, res: Response, next: NextFunction) => {
    const accountId = req.user?.userId;
    if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

    const { ticketId } = req.params;
    try {
      const result = await this.ticketService.customerCancelTicket(ticketId, accountId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}

export default TicketController;

