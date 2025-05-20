import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { OwnershipHistory, OwnershipTransferStatus } from '../types/auth';
import TicketTypeService from './ticket-type.service';

class OwnershipHistoryService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async initiateOwnershipTransfer(input: {
        device_serial: string;
        to_user_email: string;
        from_user_id: string;
        groupId?: number;
    }): Promise<void> {
        const { device_serial, to_user_email, from_user_id, groupId } = input;

        // Validate device
        const device = await this.prisma.devices.findUnique({
            where: { serial_number: device_serial, is_deleted: false },
            include: { spaces: { include: { houses: true } } },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');
        if (device!.account_id !== from_user_id) throwError(ErrorCodes.FORBIDDEN, 'Only device owner can initiate transfer');

        // Validate group if provided
        if (groupId) {
            const derivedGroupId = device!.group_id || device!.spaces?.houses?.group_id;
            if (!derivedGroupId || derivedGroupId !== groupId) {
                throwError(ErrorCodes.NOT_FOUND, 'Device not in specified group');
            }
        }

        // Find recipient
        const customer = await this.prisma.customer.findUnique({ where: { email: to_user_email } });
        const recipient = await this.prisma.account.findFirst({ where: { customer_id: customer?.id } });
        if (!recipient) throwError(ErrorCodes.NOT_FOUND, 'Recipient account not found');

        // Check if device is already associated with recipient
        if (device!.account_id === recipient!.account_id) {
            throwError(ErrorCodes.CONFLICT, 'Device is already owned by the recipient');
        }

        // Find or create ticket type for ownership transfer
        const ticketTypeService = new TicketTypeService();
        let ticketType = await this.prisma.ticket_types.findFirst({
            where: { type_name: 'Ownership Transfer', is_deleted: false },
        });
        if (!ticketType) {
            ticketType = await ticketTypeService.createTicketType({
                type_name: 'Ownership Transfer',
                priority: 1,
                is_active: true,
            });
        }

        // Create ticket for ownership transfer
        const ticket = await this.prisma.tickets.create({
            data: {
                user_id: from_user_id,
                device_serial,
                ticket_type_id: ticketType.ticket_type_id,
                description: `Ownership transfer request for device ${device_serial} to ${to_user_email}`,
                status: OwnershipTransferStatus.PENDING,
                created_at: new Date(),
            },
        });

        // Create ownership history entry
        await this.prisma.ownership_history.create({
            data: {
                ticket_id: ticket.ticket_id,
                device_serial,
                from_user_id,
                to_user_id: recipient!.account_id,
                created_at: new Date(),
                // Note: removed status field as it doesn't exist in the Prisma schema
            },
        });

        // Create notification for recipient
        await this.prisma.notification.create({
            data: {
                id: 0,
                account_id: recipient!.account_id,
                text: `Ownership transfer request for device ${device!.name} from user ${from_user_id}`,
                type: 'ownership_transfer',
                is_read: false,
                created_at: new Date(),
            },
        });
    }

    async approveOwnershipTransfer(ticketId: number, accept: boolean, approverId: string): Promise<void> {
        const ownershipHistory = await this.prisma.ownership_history.findFirst({
            where: { ticket_id: ticketId, is_deleted: false },
            include: { devices: true, tickets: true },
        });
        if (!ownershipHistory || !ownershipHistory!.devices || !ownershipHistory!.tickets) {
            throwError(ErrorCodes.NOT_FOUND, 'Ownership transfer request or device not found');
        }

        // Verify approver is the recipient
        if (ownershipHistory!.to_user_id !== approverId) {
            throwError(ErrorCodes.FORBIDDEN, 'Only the recipient can approve the transfer');
        }

        const ticket = await this.prisma.tickets.findUnique({
            where: { ticket_id: ticketId },
        });
        if (!ticket || ticket.status !== OwnershipTransferStatus.PENDING) {
            throwError(ErrorCodes.CONFLICT, 'Invalid or already processed ticket');
        }

        if (!accept) {
            // Reject transfer
            await this.prisma.tickets.update({
                where: { ticket_id: ticketId },
                data: { status: OwnershipTransferStatus.REJECTED, updated_at: new Date() },
            });
            await this.prisma.ownership_history.update({
                where: {
                    history_id_ticket_id: {
                        history_id: ownershipHistory!.history_id,
                        ticket_id: ticketId
                    }
                },
                data: { is_deleted: true, updated_at: new Date() },
            });

            // Notify initiator
            await this.prisma.notification.create({
                data: {
                    id: 0,
                    account_id: ownershipHistory!.from_user_id,
                    text: `Ownership transfer request for device ${ownershipHistory!.device_serial} was rejected`,
                    type: 'ownership_transfer_rejected',
                    is_read: false,
                    created_at: new Date(),
                },
            });
            return;
        }

        // Approve transfer
        await this.prisma.$transaction(async (prisma) => {
            // Update ticket
            await prisma.tickets.update({
                where: { ticket_id: ticketId },
                data: { status: OwnershipTransferStatus.APPROVED, updated_at: new Date() },
            });

            // Update ownership history
            await prisma.ownership_history.update({
                where: {
                    history_id_ticket_id: {
                        history_id: ownershipHistory!.history_id,
                        ticket_id: ticketId
                    }
                },
                data: {
                    transferred_at: new Date(),
                    updated_at: new Date(),
                },
            });

            // Update device ownership
            await prisma.devices.update({
                where: {
                    // @ts-ignore
                    serial_number: ownershipHistory!.device_serial },
                data: {
                    account_id: ownershipHistory!.to_user_id,
                    group_id: null, // Remove from group if any
                    updated_at: new Date(),
                },
            });

            // Remove any shared permissions
            await prisma.shared_permissions.updateMany({
                where: { device_serial: ownershipHistory!.device_serial, is_deleted: false },
                data: { is_deleted: true, updated_at: new Date() },
            });

            // Notify initiator and recipient
            await prisma.notification.createMany({
                data: [
                    {
                        // Let auto-increment handle this in a proper schema
                        account_id: ownershipHistory!.from_user_id,
                        text: `Ownership of device ${ownershipHistory!.device_serial} successfully transferred to ${ownershipHistory!.to_user_id}`,
                        type: 'ownership_transfer_success',
                        is_read: false,
                        created_at: new Date(),
                        id: 0
                    },
                    {
                        account_id: ownershipHistory!.to_user_id,
                        text: `You are now the owner of device ${ownershipHistory!.device_serial}`,
                        type: 'ownership_transfer_success',
                        is_read: false,
                        created_at: new Date(),
                        id: 0
                    },
                ],
                skipDuplicates: true,
            });
        });
    }

    async getOwnershipHistoryById(historyId: number): Promise<OwnershipHistory> {
        const history = await this.prisma.ownership_history.findFirst({
            where: {
                history_id: historyId,
                is_deleted: false
            },
            include: { tickets: true, devices: true },
        });
        if (!history) throwError(ErrorCodes.NOT_FOUND, 'Ownership history not found');

        return this.mapPrismaOwnershipHistoryToAuthOwnershipHistory(history);
    }

    async getOwnershipHistoryByDevice(device_serial: string): Promise<OwnershipHistory[]> {
        const histories = await this.prisma.ownership_history.findMany({
            where: { device_serial, is_deleted: false },
            include: { tickets: true, devices: true },
        });

        return histories.map((history) => this.mapPrismaOwnershipHistoryToAuthOwnershipHistory(history));
    }

    async getOwnershipHistoryByUser(userId: string): Promise<OwnershipHistory[]> {
        const histories = await this.prisma.ownership_history.findMany({
            where: {
                OR: [{ from_user_id: userId }, { to_user_id: userId }],
                is_deleted: false,
            },
            include: { tickets: true, devices: true },
        });

        return histories.map((history) => this.mapPrismaOwnershipHistoryToAuthOwnershipHistory(history));
    }

    async deleteOwnershipHistory(historyId: number, userId: string): Promise<void> {
        const history = await this.prisma.ownership_history.findFirst({
            where: {
                history_id: historyId,
                is_deleted: false
            },
            include: { tickets: true },
        });
        if (!history) throwError(ErrorCodes.NOT_FOUND, 'Ownership history not found');
        if (history!.from_user_id !== userId && history!.to_user_id !== userId) {
            throwError(ErrorCodes.FORBIDDEN, 'Only involved users can delete history');
        }

        await this.prisma.ownership_history.update({
            where: {
                history_id_ticket_id: {
                    history_id: historyId,
                    ticket_id: history!.ticket_id
                }
            },
            data: { is_deleted: true, updated_at: new Date() },
        });
    }

    private mapPrismaOwnershipHistoryToAuthOwnershipHistory(history: any): OwnershipHistory {
        return {
            history_id: history!.history_id,
            ticket_id: history!.ticket_id,
            device_serial: history!.device_serial ?? null,
            from_user_id: history!.from_user_id ?? null,
            to_user_id: history!.to_user_id ?? null,
            transferred_at: history!.transferred_at ?? null,
            legal_expired_date: history!.legal_expired_date ?? null,
            is_expired: history!.is_expired ?? null,
            created_at: history!.created_at ?? null,
            updated_at: history!.updated_at ?? null,
            is_deleted: history!.is_deleted ?? null,
        };
    }
}

export default OwnershipHistoryService;