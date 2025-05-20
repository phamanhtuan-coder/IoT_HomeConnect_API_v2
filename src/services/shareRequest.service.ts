import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import {PermissionType, ShareRequest, ShareRequestStatus} from "../types/share-request";
import {GroupRole} from "../types/group";
import {SharedPermission} from "../types/share-permission";

class ShareRequestService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    private async validateDeviceAndGroup(deviceId: number, serial_number: string, groupId: number): Promise<{ device: any; groupId: number }> {
        const device = await this.prisma.devices.findUnique({
            where: { device_id_serial_number: { device_id: deviceId, serial_number }, is_deleted: false },
            include: { spaces: { include: { houses: true } } },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');
        if (!device!.device_id) throwError(ErrorCodes.NOT_FOUND, 'Device ID is missing');

        const derivedGroupId = device!.group_id || device!.spaces?.houses?.group_id;
        if (!derivedGroupId) throwError(ErrorCodes.NOT_FOUND, 'Device not associated with any group');
        if (derivedGroupId !== groupId) throwError(ErrorCodes.NOT_FOUND, 'Device not in specified group');

        // @ts-ignore
        return { device, groupId: derivedGroupId };
    }

    async initiateShareRequest(input: {
        device_serial: string;
        to_user_email: string;
        permission_type: PermissionType;
        from_user_id: string;
        groupId: number;
        requesterRole: GroupRole;
    }): Promise<void> {
        const { device_serial, to_user_email, permission_type, from_user_id, groupId, requesterRole } = input;

        const device = await this.prisma.devices.findUnique({
            where: { serial_number: device_serial, is_deleted: false },
            include: { spaces: { include: { houses: true } } },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');

        const derivedGroupId = device!.group_id || device!.spaces?.houses?.group_id;
        if (!derivedGroupId || derivedGroupId !== groupId) {
            throwError(ErrorCodes.NOT_FOUND, 'Device not in group');
        }

        if (device!.account_id !== from_user_id && requesterRole !== GroupRole.OWNER) {
            throwError(ErrorCodes.FORBIDDEN, 'Only device.ts owner or group owner can share');
        }

        const customer = await this.prisma.customer.findUnique({ where: { email: to_user_email } });
        const recipient = await this.prisma.account.findFirst({ where: { customer_id: customer!.id } });

        if (!recipient) throwError(ErrorCodes.NOT_FOUND, 'Recipient account not found');

        const userGroup = await this.prisma.user_groups.findFirst({
            where: { group_id: groupId, account_id: recipient!.account_id, is_deleted: false },
        });
        if (userGroup) throwError(ErrorCodes.CONFLICT, 'Recipient is already in the group');

        const existingPermission = await this.prisma.shared_permissions.findFirst({
            where: {
                device_serial,
                shared_with_user_id: recipient!.account_id,
                is_deleted: false,
            },
        });
        if (existingPermission) throwError(ErrorCodes.CONFLICT, 'Device already shared with this user');

        if (requesterRole === GroupRole.VICE) {
            const groupOwner = await this.prisma.user_groups.findFirst({
                where: { group_id: groupId, role: GroupRole.OWNER, is_deleted: false },
            });
            if (!groupOwner) throwError(ErrorCodes.NOT_FOUND, 'Group owner not found');

            await this.prisma.share_requests.create({
                data: {
                    device_serial,
                    from_user_id,
                    to_user_id: groupOwner!.account_id!,
                    permission_type,
                    status: ShareRequestStatus.PENDING,
                },
            });
            return;
        }

        await this.prisma.share_requests.create({
            data: {
                device_serial,
                from_user_id,
                to_user_id: recipient!.account_id,
                permission_type,
                status: ShareRequestStatus.PENDING,
            },
        });
    }

    async approveShareRequest(requestId: number, accept: boolean, approverId: string): Promise<void> {
        const request = await this.prisma.share_requests.findUnique({
            where: { request_id: requestId, is_deleted: false },
            include: { devices: { include: { spaces: { include: { houses: true } } } } },
        });
        if (!request || !request!.devices) throwError(ErrorCodes.NOT_FOUND, 'Share request or device.ts not found');

        const groupId = request!.devices!.group_id || request!.devices!.spaces?.houses?.group_id;
        if (!groupId) throwError(ErrorCodes.NOT_FOUND, 'Group not found');

        const isGroupOwner = await this.prisma.user_groups.findFirst({
            where: { group_id: groupId, account_id: approverId, role: GroupRole.OWNER, is_deleted: false },
        });
        const isRecipient = request!.to_user_id === approverId;

        if (!isGroupOwner && !isRecipient) throwError(ErrorCodes.FORBIDDEN, 'Only group owner or recipient can approve');

        if (!accept) {
            await this.prisma.share_requests.update({
                where: { request_id: requestId },
                data: { status: ShareRequestStatus.REJECTED, is_deleted: true, updated_at: new Date() },
            });
            return;
        }

        if (isGroupOwner && request!.from_user_id !== request!.to_user_id) {
            const recipient = await this.prisma.account.findUnique({
                where: { account_id: request!.to_user_id! },
            });
            if (!recipient) throwError(ErrorCodes.NOT_FOUND, 'Recipient not found');

            await this.prisma.share_requests.create({
                data: {
                    device_serial: request!.device_serial!,
                    from_user_id: request!.from_user_id!,
                    to_user_id: recipient!.account_id,
                    permission_type: request!.permission_type as PermissionType,
                    status: ShareRequestStatus.PENDING,
                },
            });

            await this.prisma.share_requests.update({
                where: { request_id: requestId },
                data: { status: ShareRequestStatus.APPROVED, approved_at: new Date(), updated_at: new Date() },
            });
            return;
        }

        await this.prisma.shared_permissions.create({
            data: {
                device_serial: request!.device_serial!,
                shared_with_user_id: request!.to_user_id!,
                permission_type: request!.permission_type as PermissionType,
            },
        });

        await this.prisma.share_requests.update({
            where: { request_id: requestId },
            data: { status: ShareRequestStatus.APPROVED, approved_at: new Date(), updated_at: new Date() },
        });
    }

    async getShareRequestsByDevice(deviceId: number, _serial_number: string, groupId: number): Promise<ShareRequest[]> {
        const { device } = await this.validateDeviceAndGroup(deviceId, deviceId.toString(), groupId);

        const requests = await this.prisma.share_requests.findMany({
            where: { device_serial: device!.serial_number, is_deleted: false },
        });

        return requests.map(request => this.mapPrismaShareRequestToAuthShareRequest(request));
    }

    async getSharedPermissionsByDevice(deviceId: number, serial_number: string, groupId: number): Promise<SharedPermission[]> {
        const { device } = await this.validateDeviceAndGroup(deviceId, serial_number, groupId);

        const permissions = await this.prisma.shared_permissions.findMany({
            where: { device_serial: device.serial_number, is_deleted: false },
        });

        return permissions.map(permission => ({
            permission_id: permission.permission_id,
            device_id: device.device_id ?? null,
            shared_with_user_id: permission.shared_with_user_id ?? null,
            permission_type: permission.permission_type as PermissionType,
            created_at: permission.created_at ?? null,
            updated_at: permission.updated_at ?? null,
            is_deleted: permission.is_deleted ?? null,
        }));
    }

    async getSharedDevicesByOwner(ownerId: string): Promise<SharedPermission[]> {
        const permissions = await this.prisma.shared_permissions.findMany({
            where: {
                devices: { account_id: ownerId, is_deleted: false },
                is_deleted: false,
            },
            include: { devices: true },
        });

        return permissions.map(permission => ({
            permission_id: permission.permission_id,
            device_id: permission.devices?.device_id ?? null,
            shared_with_user_id: permission.shared_with_user_id ?? null,
            permission_type: permission.permission_type as PermissionType,
            created_at: permission.created_at ?? null,
            updated_at: permission.updated_at ?? null,
            is_deleted: permission.is_deleted ?? null,
        }));
    }

    private mapPrismaShareRequestToAuthShareRequest(request: any): ShareRequest {
        return {
            request_id: request!.request_id,
            device_serial: request!.device_serial ?? null,
            from_user_id: request!.from_user_id ?? null,
            to_user_id: request!.to_user_id ?? null,
            permission_type: request!.permission_type as PermissionType,
            status: request!.status as ShareRequestStatus,
            requested_at: request!.requested_at ?? null,
            approved_at: request!.approved_at ?? null,
            created_at: request!.created_at ?? null,
            updated_at: request!.updated_at ?? null,
            is_deleted: request!.is_deleted ?? null,
        };
    }
}

export default ShareRequestService;