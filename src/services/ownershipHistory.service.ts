import { PrismaClient } from '@prisma/client';
import { ErrorCodes, get_error_response, throwError } from '../utils/errors';
import TicketTypeService from './ticket-type.service';
import NotificationService from './notification.service';
import { NotificationType } from '../types/notification';
import {OwnershipHistory, OwnershipTransferStatus} from "../types/ownership-history";
import {generateTicketId} from "../utils/helpers";
import { STATUS_CODE } from '../contants/status';
import { ERROR_CODES } from '../contants/error';
import { executeSelectData } from '../utils/sql_query';
import prisma from "../config/database";

class OwnershipHistoryService {
    private prisma: PrismaClient;
    private notificationService: NotificationService;

    constructor() {
        this.prisma = prisma;
        this.notificationService = new NotificationService();
    }

    async initiateOwnershipTransfer(input: {
        device_serial: string;
        to_user_email: string;
        from_user_id: string;
        groupId?: number;
    }): Promise<void> {
        const { device_serial, to_user_email, from_user_id, groupId } = input;

        // Validate device.ts
        const device = await this.prisma.devices.findUnique({
            where: { serial_number: device_serial, is_deleted: false },
            include: { spaces: { include: { houses: true } } },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');
        if (device!.account_id !== from_user_id) throwError(ErrorCodes.FORBIDDEN, 'Only device.ts owner can initiate transfer');

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

        // Check if device.ts is already associated with recipient
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
        let ticket_id: string;
        let attempts = 0;
        const maxAttempts = 5;
        do {
            ticket_id = generateTicketId();
            const idExists = await this.prisma.tickets.findFirst({ where: { ticket_id:ticket_id}});
            if (!idExists) break;
            attempts++;
            if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique ID');
        } while (true);

        // Create ticket for ownership transfer
        const ticket = await this.prisma.tickets.create({
            data: {
                ticket_id: ticket_id,
                user_id: from_user_id,
                device_serial,
                ticket_type_id: ticketType!.ticket_type_id,
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

        // Create notification for recipient using NotificationService
        await this.notificationService.createNotification({
            account_id: recipient!.account_id,
            text: `Ownership transfer request for device ${device!.name || device_serial} from user ${from_user_id}`,
            type: NotificationType.SECURITY,
        });
    }

    // Phản hồi nhượng quyền thiết bị
    async approveOwnershipTransfer(ticketId: string, accept: boolean, approverId: string): Promise<any> {
        // 1. Lấy thông tin yêu cầu nhượng quyền thiết bị
        const ownershipHistory = await this.prisma.ownership_history.findFirst({
            where: { ticket_id: ticketId, is_deleted: false },
            include: { devices: true, tickets: true },
        });
    
        // 2. Kiểm tra thông tin yêu cầu nhượng quyền thiết bị
        if (!ownershipHistory) {
            throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy yêu cầu nhượng quyền');
        }
        if (!ownershipHistory!.devices) {
            throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy thiết bị');
        }
        if (!ownershipHistory!.tickets) {
            throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy ticket');
        }

        // 3. Kiểm tra quyền xác nhận nhượng quyền thiết bị
        if (ownershipHistory!.to_user_id !== approverId) {
            throwError(ErrorCodes.FORBIDDEN, 'Chỉ người nhận mới có quyền xác nhận nhượng quyền thiết bị');
        }

        // 4. Kiểm tra trạng thái yêu cầu nhượng quyền thiết bị
        if (ownershipHistory!.tickets.status !== OwnershipTransferStatus.PENDING) {
            throwError(ErrorCodes.CONFLICT, 'Yêu cầu nhượng quyền thiết bị không hợp lệ hoặc đã được xử lý');
        }

        // 5. Từ chối nhượng quyền thiết bị
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

            // Notify initiator using NotificationService
            await this.notificationService.createNotification({
                // @ts-ignore
                account_id: ownershipHistory!.from_user_id,
                text: `Yêu cầu nhượng quyền thiết bị cho thiết bị ${ownershipHistory!.device_serial} đã bị từ chối`,
                type: NotificationType.SECURITY,
            });

            return get_error_response(
                ERROR_CODES.SUCCESS,
                STATUS_CODE.OK,
                'Yêu cầu nhượng quyền thiết bị đã bị từ chối'
            );
        }

        // 6. Xác nhận nhượng quyền thiết bị
        await this.prisma.$transaction(async (prisma) => {
            // Update ticket
            await prisma.tickets.update({
                where: { ticket_id: ticketId },
                data: { status: OwnershipTransferStatus.APPROVED, updated_at: new Date() },
            });

            /**
             * Sau khi xác nhận nhượng quyền thiết bị, thì sẽ có 2 bản ghi ownership_history
             * 1. Bản ghi cũ là của người chuyển (from_user_id)
             * 2. Bản ghi mới là của người nhận (to_user_id)
             * 
             * ==> Cần xóa quyền chia sẻ thiết bị của bản ghi cũ (from_user_id)
             * 
             * Và cập nhật thông tin thiết bị cho bản ghi mới (to_user_id)
             * 
             */

            // 7. Tính ngày hết hạn
            const legal_expired_date = new Date();
            legal_expired_date.setMonth(legal_expired_date.getMonth() + 3);

            // 7.1. Cập nhật thông tin thiết bị cho bản ghi mới (to_user_id)
            await prisma.ownership_history.update({
                where: {
                    history_id_ticket_id: {
                        history_id: ownershipHistory!.history_id,
                        ticket_id: ticketId
                    }
                },
                data: {
                    transferred_at: new Date(),
                    legal_expired_date: legal_expired_date,
                    updated_at: new Date(),
                },
            });

            // 7.2. Xóa quyền sở hữu thiết bị của chủ sở hữu cũ (from_user_id)
            await prisma.ownership_history.updateMany({
                where: {
                    device_serial: ownershipHistory!.device_serial,
                    history_id: { not: ownershipHistory!.history_id },
                    to_user_id: ownershipHistory!.from_user_id,
                    is_deleted: false,
                },
                data: {
                    legal_expired_date: null,
                    transferred_at: null,
                    updated_at: new Date(),
                },
            });

            // 7.3. Cập nhật thông tin thiết bị
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
        });

        // 9. Gửi thông báo đến người nhượng quyền thiết bị
        await this.notificationService.createNotification({
            // @ts-ignore
            account_id: ownershipHistory!.from_user_id,
            text: `Nhượng quyền thiết bị cho thiết bị ${ownershipHistory!.device_serial} thành công`,
            type: NotificationType.SECURITY,
        });

        // 10. Gửi thông báo đến người nhận thiết bị
        await this.notificationService.createNotification({
            // @ts-ignore
            account_id: ownershipHistory!.to_user_id,
            text: `Bạn đã trở thành chủ sở hữu thiết bị ${ownershipHistory!.device_serial}`,
            type: NotificationType.SECURITY,
        });

        return get_error_response(
            ERROR_CODES.SUCCESS,
            STATUS_CODE.OK,
            'Yêu cầu nhượng quyền thiết bị đã được xác nhận'
        );
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

    async getOwnershipHistoryByDevice(device_serial: string): Promise<any> {

        const filters = {
            field: "oh.device_serial",
            condition: "=",
            value: device_serial,

        }

        const get_attr = `
            oh.history_id, oh.ticket_id, oh.device_serial,oh.transferred_at, 
            oh.legal_expired_date,

            t.status as ticket_status,
            d.name as device_name,
            
            from_acc.account_id as from_user_id,
            from_cus.surname as from_surname,
            from_cus.lastname as from_lastname,
            
            to_acc.account_id as to_user_id,
            to_cus.surname as to_surname,
            to_cus.lastname as to_lastname
        `;

        const get_table = "ownership_history oh";

        const query_join = `
            LEFT JOIN tickets t ON oh.ticket_id = t.ticket_id
            LEFT JOIN devices d ON oh.device_serial = d.serial_number

            LEFT JOIN accounts from_acc ON oh.from_user_id = from_acc.account_id
            LEFT JOIN customers from_cus ON from_acc.account_id = from_cus.account_id

            LEFT JOIN accounts to_acc ON oh.to_user_id = to_acc.account_id
            LEFT JOIN customers to_cus ON to_acc.account_id = to_cus.account_id
        `;
        
        const result = await executeSelectData({
            table: get_table,
            strGetColumn: get_attr,
            queryJoin: query_join,
            filter: filters,
        });

        return get_error_response(
            ERROR_CODES.SUCCESS,
            STATUS_CODE.OK,
            'Lấy dữ liệu thành công',
            result.data
        );
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

        // Add notification for deletion
        await this.notificationService.createNotification({
            account_id: userId,
            text: `Ownership history #${historyId} has been deleted.`,
            type: NotificationType.SECURITY,
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