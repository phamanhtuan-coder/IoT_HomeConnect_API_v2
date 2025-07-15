import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import {GroupRole} from "../types/group";
import { PermissionType } from '../types/share-request';
import { TICKET_TYPE } from '../contants/info';
import { ERROR_CODES } from '../contants/error';
import { sendEmergencyAlertEmail } from './email.service';
import { executeSelectData } from '../utils/sql_query';
import prisma from "../config/database";

// Import the Filter interface from sql_query.ts
interface FilterCondition {
    field: string;
    condition: string;
    value: any;
}

interface FilterGroup {
    logic: 'AND' | 'OR';
    filters: (FilterCondition | FilterGroup)[];
}

type Filter = FilterCondition | FilterGroup;

class SharedPermissionService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma
    }

    async getDeviceSharedForCustomer(accountId: string, search: string) {
        const account = await this.prisma.account.findUnique({
            where: { account_id: accountId }
        });

        const filters: Filter[] = [
            {
                logic: "OR" as const,
                filters: [
                    {
                        field: "shared_permissions.shared_with_user_id",
                        condition: "=",
                        value: account!.account_id
                    }
                ]
            },
            {
                logic: "OR" as const,
                filters: [
                    {
                        field: "devices.name",
                        condition: "contains",
                        value: `${search ? search : ''}`
                    },
                    {
                        field: "devices.serial_number",
                        condition: "contains",
                        value: `${search ? search : ''}`
                    },
                    {
                        field: "device_templates.name",
                        condition: "contains",
                        value: `${search ? search : ''}`
                    },
                    {
                        field: "categories.name",
                        condition: "contains",
                        value: `${search ? search : ''}`
                    }
                ]
            }
        ]
        if (!account) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy tài khoản');

        const get_attr = `
        shared_permissions.permission_id, shared_permissions.device_serial, shared_permissions.permission_type,
        devices.serial_number, shared_permissions.shared_with_user_id,
        devices.name as device_name,
        devices.template_id,
        device_templates.name as template_device_name,
        devices.device_id,
        categories.name as category_name
        `;

        const get_table = "shared_permissions"

        let query_join = `
            LEFT JOIN devices ON shared_permissions.device_serial = devices.serial_number
            LEFT JOIN device_templates ON devices.template_id = device_templates.template_id
            LEFT JOIN categories ON device_templates.device_type_id = categories.category_id
        `;

        const result = executeSelectData({
            table: get_table,
            strGetColumn: get_attr,
            queryJoin: query_join,
            filter: filters,
            idSpecial: "permission_id",
            isDeleteBoolean: true,
        });

        return result;
    }

    async getSharedUsersBySerialNumber(serialNumber: string) {
        const filters: Filter = {
            field: "shared_permissions.device_serial",
            condition: "=",
            value: serialNumber
        }
        const get_attr = `
        shared_permissions.permission_id, shared_permissions.device_serial, shared_permissions.permission_type,
        shared_permissions.shared_with_user_id,
        CONCAT(customer.surname, ' ', customer.lastname) as customer_name,
        customer.email as customer_email,
        customer.image as customer_image
        `;

        const get_table = "shared_permissions"

        let query_join = `
            LEFT JOIN devices ON shared_permissions.device_serial = devices.serial_number
            LEFT JOIN account ON shared_permissions.shared_with_user_id = account.account_id
            LEFT JOIN customer ON account.customer_id = customer.id
        `;

        const sharedUsers = executeSelectData({
            table: get_table,
            strGetColumn: get_attr,
            queryJoin: query_join,
            idSpecial: "permission_id",
            isDeleteBoolean: true,
            filter: filters,
        });

        return sharedUsers;
    }
    
    async revokeShareDevice(serialNumber: string, requesterId: string, requesterRole: GroupRole): Promise<any> {
        const account = await this.prisma.account.findUnique({
            where: { account_id: requesterId },
            include: {
                customer: true
            }
        });
        if (!account) {
            throwError(ErrorCodes.NOT_FOUND, 'Người dùng không tồn tại');
        }

        const permission = await this.prisma.shared_permissions.findFirst({
            where: { device_serial: serialNumber, is_deleted: false },
            include: { devices: true },
        });
        
        if(!permission) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy quyền sử dụng thiết bị');

        if (permission!.devices!.account_id !== requesterId && requesterRole !== GroupRole.OWNER) {
            throwError(ErrorCodes.FORBIDDEN, 'Chỉ có chủ sở hữu thiết bị hoặc chủ nhóm mới có thể hủy chia sẻ');
        }

        await this.prisma.shared_permissions.update({
            where: { permission_id: permission!.permission_id },
            data: { is_deleted: true, updated_at: new Date() },
        });

        return {
            success: true,
            message: `Đã hủy chia sẻ thiết bị ${serialNumber} thành công đối với người dùng ${account!.customer!.surname} ${account!.customer!.lastname}`,
        }
    }

    async revokeShareByRecipient(serialNumber: string, recipientId: string): Promise<any> {
        const account = await this.prisma.account.findUnique({
            where: { account_id: recipientId },
            include: {
                customer: true
            }
        });
        if (!account) {
            throwError(ErrorCodes.NOT_FOUND, 'Người dùng không tồn tại');
        }

        const permission = await this.prisma.shared_permissions.findFirst({
            where: { device_serial: serialNumber, shared_with_user_id: recipientId, is_deleted: false },
        });
        if (!permission) {
            throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy quyền sử dụng thiết bị hoặc không có quyền truy cập');
        }

        await this.prisma.shared_permissions.update({
            where: { permission_id: permission!.permission_id },
            data: { is_deleted: true, updated_at: new Date() },
        });

        return {
            success: true,
            message: `Gỡ quyền sử dụng thiết bị thành công`,
            data: {
                permission_id: permission!.permission_id,
                device_serial: serialNumber,
                shared_with_user_id: recipientId,
                permission_type: permission!.permission_type,
            }
        }
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
                data: { updated_at: new Date(), status: 'approved' },
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