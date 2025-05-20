// src/services/ticket.service.ts
import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import NotificationService from './notification.service';
import { NotificationType } from '../types/notification';
import {Ticket} from "../types/ticket";

class TicketService {
  private prisma: PrismaClient;
  private notificationService: NotificationService;

  constructor() {
    this.prisma = new PrismaClient();
    this.notificationService = new NotificationService();
  }

  async createTicket(input: {
    user_id: string;
    device_serial?: string;
    ticket_type_id: number;
    description?: string;
    evidence?: any;
  }): Promise<Ticket> {
    const { user_id, device_serial, ticket_type_id, description, evidence } = input;

    const account = await this.prisma.account.findUnique({
      where: { account_id: user_id, deleted_at: null },
    });
    if (!account) throwError(ErrorCodes.NOT_FOUND, 'Account not found');

    if (device_serial) {
      const device = await this.prisma.devices.findUnique({
        where: { serial_number: device_serial, is_deleted: false },
      });
      if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');
    }

    const ticketType = await this.prisma.ticket_types.findUnique({
      where: { ticket_type_id, is_deleted: false },
    });
    if (!ticketType) throwError(ErrorCodes.NOT_FOUND, 'Ticket type not found');

    const ticket = await this.prisma.tickets.create({
      data: {
        user_id,
        device_serial,
        ticket_type_id,
        description,
        evidence,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    await this.notificationService.createNotification({
      account_id: user_id,
      text: `New ticket created: ${description || 'No description provided'}`,
      type: NotificationType.TICKET,
    });

    return this.mapPrismaTicketToAuthTicket(ticket);
  }

  async updateTicket(
      ticketId: number,
      data: {
        description?: string;
        evidence?: any;
        status?: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'resolved';
        assigned_to?: string;
        resolve_solution?: string;
      }
  ): Promise<Ticket> {
    const ticket = await this.prisma.tickets.findUnique({
      where: { ticket_id: ticketId, is_deleted: false },
    });
    if (!ticket) throwError(ErrorCodes.NOT_FOUND, 'Ticket not found');

    const updatedTicket = await this.prisma.tickets.update({
      where: { ticket_id: ticketId },
      data: {
        description: data.description,
        evidence: data.evidence,
        status: data.status,
        assigned_to: data.assigned_to,
        resolve_solution: data.resolve_solution,
        updated_at: new Date(),
        resolved_at: data.status === 'resolved' ? new Date() : undefined,
      },
    });

    if (data.status) {
      await this.notificationService.createNotification({
        account_id: ticket!.user_id!,
        text: `Ticket #${ticketId} status updated to ${data.status}.`,
        type: NotificationType.TICKET,
      });
    }

    return this.mapPrismaTicketToAuthTicket(updatedTicket);
  }

  async deleteTicket(ticketId: number): Promise<void> {
    const ticket = await this.prisma.tickets.findUnique({
      where: { ticket_id: ticketId, is_deleted: false },
    });
    if (!ticket) throwError(ErrorCodes.NOT_FOUND, 'Ticket not found');

    await this.prisma.tickets.update({
      where: { ticket_id: ticketId },
      data: { is_deleted: true, updated_at: new Date() },
    });

    await this.notificationService.createNotification({
      account_id: ticket!.user_id!,
      text: `Ticket #${ticketId} has been deleted.`,
      type: NotificationType.TICKET,
    });
  }

  async getTicketById(ticketId: number): Promise<Ticket> {
    const ticket = await this.prisma.tickets.findUnique({
      where: { ticket_id: ticketId, is_deleted: false },
    });
    if (!ticket) throwError(ErrorCodes.NOT_FOUND, 'Ticket not found');

    return this.mapPrismaTicketToAuthTicket(ticket);
  }

  async getTicketsByUser(userId: string): Promise<Ticket[]> {
    const tickets = await this.prisma.tickets.findMany({
      where: { user_id: userId, is_deleted: false },
      orderBy: { created_at: 'desc' },
    });

    return tickets.map(this.mapPrismaTicketToAuthTicket);
  }

  async getAllTickets(filters: {
    user_id?: string;
    ticket_type_id?: number;
    status?: string;
    created_at_start?: Date;
    created_at_end?: Date;
    resolved_at_start?: Date;
    resolved_at_end?: Date;
    page?: number;
    limit?: number;
  }): Promise<Ticket[]> {
    const { user_id, ticket_type_id, status, created_at_start, created_at_end, resolved_at_start, resolved_at_end, page = 1, limit = 10 } = filters;

    const tickets = await this.prisma.tickets.findMany({
      where: {
        user_id,
        ticket_type_id,
        status,
        created_at: {
          gte: created_at_start,
          lte: created_at_end,
        },
        resolved_at: {
          gte: resolved_at_start,
          lte: resolved_at_end,
        },
        is_deleted: false,
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return tickets.map(this.mapPrismaTicketToAuthTicket);
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