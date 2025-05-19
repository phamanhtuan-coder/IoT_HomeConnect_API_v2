import { PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";
import { Ticket } from "../types/auth";

class TicketService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createTicket(
    userId: string,
    data: {
      device_serial?: string;
      ticket_type_id: number;
      description?: string;
      evidence?: any;
    }
  ): Promise<Ticket> {
    // Validate ticket_type_id
    const ticketType = await this.prisma.ticket_types.findUnique({
      where: { ticket_type_id: data.ticket_type_id, is_deleted: false },
    });
    if (!ticketType) {
      throwError(ErrorCodes.NOT_FOUND, "Ticket type not found");
    }

    // Validate device_serial if provided
    if (data.device_serial) {
      const device = await this.prisma.devices.findUnique({
        where: { serial_number: data.device_serial, is_deleted: false },
      });
      if (!device) {
        throwError(ErrorCodes.NOT_FOUND, "Device not found");
      }
    }

    const ticket = await this.prisma.tickets.create({
      data: {
        user_id: userId,
        device_serial: data.device_serial,
        ticket_type_id: data.ticket_type_id,
        description: data.description,
        evidence: data.evidence,
        status: "pending",
      },
    });

    return this.mapPrismaTicketToAuthTicket(ticket);
  }

  async updateTicket(
    ticketId: number,
    data: {
      description?: string;
      evidence?: any;
      status?: string;
      assigned_to?: string;
      resolve_solution?: string;
    }
  ): Promise<Ticket> {
    const ticket = await this.prisma.tickets.findUnique({
      where: { ticket_id: ticketId, is_deleted: false },
    });
    if (!ticket) {
      throwError(ErrorCodes.NOT_FOUND, "Ticket not found");
    }

    // Validate assigned_to if provided
    if (data.assigned_to) {
      const employee = await this.prisma.account.findUnique({
        where: { account_id: data.assigned_to },
      });
      if (!employee || !employee.employee_id) {
        throwError(ErrorCodes.NOT_FOUND, "Employee not found");
      }
    }

    // Set resolved_at if status is resolved
    const resolved_at = data.status === "resolved" ? new Date() : undefined;

    const updatedTicket = await this.prisma.tickets.update({
      where: { ticket_id: ticketId },
      data: {
        description: data.description,
        evidence: data.evidence,
        status: data.status,
        assigned_to: data.assigned_to,
        resolve_solution: data.resolve_solution,
        resolved_at,
        updated_at: new Date(),
      },
    });

    return this.mapPrismaTicketToAuthTicket(updatedTicket);
  }

  async deleteTicket(ticketId: number): Promise<void> {
    const ticket = await this.prisma.tickets.findUnique({
      where: { ticket_id: ticketId, is_deleted: false },
    });
    if (!ticket) {
      throwError(ErrorCodes.NOT_FOUND, "Ticket not found");
    }

    await this.prisma.tickets.update({
      where: { ticket_id: ticketId },
      data: { is_deleted: true, updated_at: new Date() },
    });
  }

  async getTicketById(ticketId: number): Promise<Ticket> {
    const ticket = await this.prisma.tickets.findUnique({
      where: { ticket_id: ticketId, is_deleted: false },
    });
    if (!ticket) {
      throwError(ErrorCodes.NOT_FOUND, "Ticket not found");
    }

    return this.mapPrismaTicketToAuthTicket(ticket);
  }

  async getAllTickets(filters: {
    user_id?: string;
    ticket_type_id?: number;
    status?: string;
    created_at_start?: Date;
    created_at_end?: Date;
    resolved_at_start?: Date;
    resolved_at_end?: Date;
  }): Promise<Ticket[]> {
    const where: any = { is_deleted: false };

    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.ticket_type_id) where.ticket_type_id = filters.ticket_type_id;
    if (filters.status) where.status = filters.status;
    if (filters.created_at_start || filters.created_at_end) {
      where.created_at = {};
      if (filters.created_at_start)
        where.created_at.gte = filters.created_at_start;
      if (filters.created_at_end) where.created_at.lte = filters.created_at_end;
    }
    if (filters.resolved_at_start || filters.resolved_at_end) {
      where.resolved_at = {};
      if (filters.resolved_at_start)
        where.resolved_at.gte = filters.resolved_at_start;
      if (filters.resolved_at_end)
        where.resolved_at.lte = filters.resolved_at_end;
    }

    const tickets = await this.prisma.tickets.findMany({
      where,
    });

    return tickets.map((ticket) => this.mapPrismaTicketToAuthTicket(ticket));
  }

  private mapPrismaTicketToAuthTicket(ticket: any): Ticket {
    return {
      ticket_id: ticket.ticket_id,
      user_id: ticket.user_id,
      device_serial: ticket.device_serial,
      ticket_type_id: ticket.ticket_type_id,
      description: ticket.description,
      evidence: ticket.evidence,
      status: ticket.status,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      assigned_to: ticket.assigned_to,
      resolved_at: ticket.resolved_at,
      resolve_solution: ticket.resolve_solution,
      is_deleted: ticket.is_deleted,
    };
  }
}

export default TicketService;