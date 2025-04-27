import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { GroupRole } from '../types/auth';

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
            throwError(ErrorCodes.FORBIDDEN, 'Only device owner or group owner can revoke sharing');
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
}

export default SharedPermissionService;