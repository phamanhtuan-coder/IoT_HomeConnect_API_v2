import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import {GroupRole} from "../types/group";
import { PermissionType } from '../types/share-request';
import { TICKET_TYPE } from '../contants/info';
import { ERROR_CODES } from '../contants/error';
import { sendEmergencyAlertEmail } from './email.service';

class SharedPermissionService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async revokeShareDevice(permissionId: number, requesterId: string, requesterRole: GroupRole): Promise<void> {
        const permission = await this.prisma.shared_permissions.findUnique({
            where: { permission_id: permissionId, is_deleted: false },
            include: { devices: true },
        });
        if (!permission || !permission.devices) throwError(ErrorCodes.NOT_FOUND, 'Permission not found');

        if (permission!.devices!.account_id !== requesterId && requesterRole !== GroupRole.OWNER) {
            throwError(ErrorCodes.FORBIDDEN, 'Only device.ts owner or group owner can revoke sharing');
        }

        await this.prisma.shared_permissions.update({
            where: { permission_id: permissionId },
            data: { is_deleted: true, updated_at: new Date() },
        });
    }

    async revokeShareByRecipient(permissionId: number, recipientId: string): Promise<void> {
        const permission = await this.prisma.shared_permissions.findUnique({
            where: { permission_id: permissionId, is_deleted: false },
        });
        if (!permission || permission.shared_with_user_id !== recipientId) {
            throwError(ErrorCodes.NOT_FOUND, 'Permission not found or access denied');
        }

        await this.prisma.shared_permissions.update({
            where: { permission_id: permissionId },
            data: { is_deleted: true, updated_at: new Date() },
        });
    }

    async approveSharePermission(ticketId: string, recipientId: string, isApproved: boolean): Promise<any> {
        const ticket = await this.prisma.tickets.findUnique({
            where: { ticket_id: ticketId, is_deleted: false },
        });
        if (!ticket || ticket.is_deleted || ticket.ticket_type_id !== TICKET_TYPE.SHARE_PERMISSION) {
            throwError(ErrorCodes.NOT_FOUND, 'Yêu cầu chia sẻ quyền không tồn tại hoặc không có quyền truy cập');
        }   

        if (ticket!.user_id === recipientId) {
            throwError(ErrorCodes.BAD_REQUEST, 'Bạn không thể chia sẻ quyền cho chính mình');
        }
        
        if (isApproved) {
            await this.prisma.tickets.update({
                where: { ticket_id: ticketId },
                data: { updated_at: new Date(), status: 'approved', is_deleted: true },
            });

            await this.prisma.shared_permissions.create({
                data: {
                    device_serial: ticket!.device_serial,
                    shared_with_user_id: recipientId,
                    permission_type: ticket!.description,
                    created_at: new Date(),
                },
            });

            await sendEmergencyAlertEmail(
                ticket!.user_id!,
                `Bạn đã chia sẻ quyền ${ticket!.description} thiết bị ${ticket!.device_serial} cho ${recipientId} thành công!`
            );
        } else {
            await this.prisma.tickets.update({
                where: { ticket_id: ticketId },
                data: { updated_at: new Date(), status: 'rejected', is_deleted: true },
            });

            await sendEmergencyAlertEmail(
                ticket!.user_id!,
                `Yêu cầu chia sẻ quyền ${ticket!.description} thiết bị ${ticket!.device_serial} đã bị từ chối bởi ${recipientId}!`,
            );
        }

        return {
            success: true,
            message: 'Yêu cầu chia sẻ quyền đã được xử lý',
        }
    }
}

export default SharedPermissionService;