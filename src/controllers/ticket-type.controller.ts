import { Request, Response, NextFunction } from "express";
import TicketTypeService from "../services/ticket-type.service";
import { ErrorCodes, throwError } from "../utils/errors";

class TicketTypeController {
  private ticketTypeService: TicketTypeService;

  constructor() {
    this.ticketTypeService = new TicketTypeService();
  }

  /**
   * Tạo loại phiếu hỗ trợ mới
   * @param req Request Express với thông tin loại phiếu trong body
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
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

  /**
   * Cập nhật thông tin loại phiếu hỗ trợ
   * @param req Request Express với ID loại phiếu trong params và thông tin cập nhật trong body
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
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

  /**
   * Cập nhật mức độ ưu tiên của loại phiếu hỗ trợ
   * @param req Request Express với ID loại phiếu trong params và mức độ ưu tiên trong body
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
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

  /**
   * Xóa loại phiếu hỗ trợ
   * @param req Request Express với ID loại phiếu trong params
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
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

  /**
   * Lấy thông tin loại phiếu hỗ trợ theo ID
   * @param req Request Express với ID loại phiếu trong params
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
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

  /**
   * Lấy danh sách tất cả loại phiếu hỗ trợ
   * @param req Request Express
   * @param res Response Express
   * @param next Middleware tiếp theo
   */
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

