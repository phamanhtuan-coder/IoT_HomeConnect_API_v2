import { PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";
import { TicketType } from "../types/auth";

class TicketTypeService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createTicketType(data: {
    type_name: string;
    priority?: number;
    is_active?: boolean;
  }): Promise<TicketType> {
    const existingTicketType = await this.prisma.ticket_types.findFirst({
      where: { type_name: data.type_name, is_deleted: false },
    });
    if (existingTicketType) {
      throwError(ErrorCodes.CONFLICT, "Ticket type name already exists");
    }

    const ticketType = await this.prisma.ticket_types.create({
      data: {
        type_name: data.type_name,
        priority: data.priority,
        is_active: data.is_active,
      },
    });

    return this.mapPrismaTicketTypeToAuthTicketType(ticketType);
  }

  async updateTicketType(
    ticketTypeId: number,
    data: {
      type_name?: string;
      priority?: number;
      is_active?: boolean;
    }
  ): Promise<TicketType> {
    const ticketType = await this.prisma.ticket_types.findUnique({
      where: { ticket_type_id: ticketTypeId, is_deleted: false },
    });
    if (!ticketType) {
      throwError(ErrorCodes.NOT_FOUND, "Ticket type not found");
    }

    if (data.type_name) {
      const existingTicketType = await this.prisma.ticket_types.findFirst({
        where: {
          type_name: data.type_name,
          is_deleted: false,
          ticket_type_id: { not: ticketTypeId },
        },
      });
      if (existingTicketType) {
        throwError(ErrorCodes.CONFLICT, "Ticket type name already exists");
      }
    }

    const updatedTicketType = await this.prisma.ticket_types.update({
      where: { ticket_type_id: ticketTypeId },
      data: {
        type_name: data.type_name,
        priority: data.priority,
        is_active: data.is_active,
        updated_at: new Date(),
      },
    });

    return this.mapPrismaTicketTypeToAuthTicketType(updatedTicketType);
  }

  async updateTicketTypePriority(
    ticketTypeId: number,
    priority: number
  ): Promise<TicketType> {
    const ticketType = await this.prisma.ticket_types.findUnique({
      where: { ticket_type_id: ticketTypeId, is_deleted: false },
    });
    if (!ticketType) {
      throwError(ErrorCodes.NOT_FOUND, "Ticket type not found");
    }

    const updatedTicketType = await this.prisma.ticket_types.update({
      where: { ticket_type_id: ticketTypeId },
      data: { priority, updated_at: new Date() },
    });

    return this.mapPrismaTicketTypeToAuthTicketType(updatedTicketType);
  }

  async deleteTicketType(ticketTypeId: number): Promise<void> {
    const ticketType = await this.prisma.ticket_types.findUnique({
      where: { ticket_type_id: ticketTypeId, is_deleted: false },
    });
    if (!ticketType) {
      throwError(ErrorCodes.NOT_FOUND, "Ticket type not found");
    }

    await this.prisma.ticket_types.update({
      where: { ticket_type_id: ticketTypeId },
      data: { is_deleted: true, updated_at: new Date() },
    });
  }

  async getTicketTypeById(ticketTypeId: number): Promise<TicketType> {
    const ticketType = await this.prisma.ticket_types.findUnique({
      where: { ticket_type_id: ticketTypeId, is_deleted: false },
    });
    if (!ticketType) {
      throwError(ErrorCodes.NOT_FOUND, "Ticket type not found");
    }

    return this.mapPrismaTicketTypeToAuthTicketType(ticketType);
  }

  async getAllTicketTypes(): Promise<TicketType[]> {
    const ticketTypes = await this.prisma.ticket_types.findMany({
      where: { is_deleted: false },
    });

    return ticketTypes.map((ticketType) =>
      this.mapPrismaTicketTypeToAuthTicketType(ticketType)
    );
  }

  private mapPrismaTicketTypeToAuthTicketType(ticketType: any): TicketType {
    return {
      ticket_type_id: ticketType.ticket_type_id,
      type_name: ticketType.type_name,
      priority: ticketType.priority,
      is_active: ticketType.is_active,
      created_at: ticketType.created_at,
      updated_at: ticketType.updated_at,
      is_deleted: ticketType.is_deleted,
    };
  }
}

export default TicketTypeService;