import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { Group, UserGroup, GroupRole } from '../types/auth';

class GroupService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createGroup(group_name: string, ownerId: string): Promise<Group> {
        const group = await this.prisma.groups.create({
            data: { group_name },
        });

        // Create user_group entry for owner
        await this.prisma.user_groups.create({
            data: {
                account_id: ownerId,
                group_id: group.group_id,
                role: GroupRole.OWNER,
            },
        });

        return {
            ...group,
            created_at: group.created_at || null,
            updated_at: group.updated_at || null,
            is_deleted: group.is_deleted || null,
        };
    }

    async getGroup(groupId: number): Promise<Group> {
        const group = await this.prisma.groups.findUnique({
            where: { group_id: groupId, is_deleted: false },
        });
        if (!group) throwError(ErrorCodes.NOT_FOUND, 'Group not found');

        return {
            ...group,
            group_name: group!.group_name,
            group_id: group!.group_id,
            created_at: group!.created_at || null,
            updated_at: group!.updated_at || null,
            is_deleted: group!.is_deleted || null,
        };
    }

    async updateGroupName(groupId: number, group_name: string): Promise<Group> {
        const group = await this.prisma.groups.update({
            where: { group_id: groupId, is_deleted: false },
            data: { group_name, updated_at: new Date() },
        });
        if (!group) throwError(ErrorCodes.NOT_FOUND, 'Group not found');

        return {
            ...group,
            created_at: group.created_at || null,
            updated_at: group.updated_at || null,
            is_deleted: group.is_deleted || null,
        };
    }

    async deleteGroup(groupId: number): Promise<void> {
        await this.prisma.$transaction([
            // Hard delete user_groups
            this.prisma.user_groups.deleteMany({ where: { group_id: groupId } }),
            // Hard delete group
            this.prisma.groups.delete({ where: { group_id: groupId } }),
        ]);
    }

    async addUserToGroup(groupId: number, accountId: string, role: GroupRole): Promise<UserGroup> {
        const group = await this.prisma.groups.findUnique({
            where: { group_id: groupId, is_deleted: false },
        });
        if (!group) throwError(ErrorCodes.NOT_FOUND, 'Group not found');

        const account = await this.prisma.account.findUnique({
            where: { account_id: accountId },
        });
        if (!account) throwError(ErrorCodes.NOT_FOUND, 'Account not found');

        const existingUserGroup = await this.prisma.user_groups.findFirst({
            where: { group_id: groupId, account_id: accountId, is_deleted: false },
        });
        if (existingUserGroup) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to add user to group');

        const userGroup = await this.prisma.user_groups.create({
            data: {
                account_id: accountId,
                group_id: groupId,
                role,
            },
        });

        return {
            ...userGroup,
            account_id: userGroup.account_id || null,
            group_id: userGroup.group_id || null,
            role: userGroup.role as GroupRole | null,
            joined_at: userGroup.joined_at || null,
            updated_at: userGroup.updated_at || null,
            is_deleted: userGroup.is_deleted || null,
        };
    }

    async updateUserRole(groupId: number, accountId: string, role: GroupRole): Promise<UserGroup> {
        const userGroup = await this.prisma.user_groups.findFirst({
            where: { group_id: groupId, account_id: accountId, is_deleted: false },
        });
        if (!userGroup) throwError(ErrorCodes.NOT_FOUND, 'User is not a member of this group');

        const updatedUserGroup = await this.prisma.user_groups.update({
            where: { user_group_id: userGroup!.user_group_id },
            data: { role, updated_at: new Date() },
        });

        return {
            ...updatedUserGroup,
            account_id: updatedUserGroup.account_id || null,
            group_id: updatedUserGroup.group_id || null,
            role: updatedUserGroup.role as GroupRole | null,
            joined_at: updatedUserGroup.joined_at || null,
            updated_at: updatedUserGroup.updated_at || null,
            is_deleted: updatedUserGroup.is_deleted || null,
        };
    }

    async removeUserFromGroup(groupId: number, accountId: string): Promise<void> {
        const userGroup = await this.prisma.user_groups.findFirst({
            where: { group_id: groupId, account_id: accountId, is_deleted: false },
        });
        if (!userGroup) throwError(ErrorCodes.NOT_FOUND, 'User is not a member of this group');

        await this.prisma.user_groups.delete({
            where: { user_group_id: userGroup!.user_group_id },
        });

        // TODO: Remove devices owned by this user from the group if they are vice
    }

    async getUserRole(groupId: number, accountId: string): Promise<GroupRole> {
        const userGroup = await this.prisma.user_groups.findFirst({
            where: { group_id: groupId, account_id: accountId, is_deleted: false },
        });
        if (!userGroup || !userGroup.role) {
            throwError(ErrorCodes.NOT_FOUND, 'User is not a member of this group');
        }
        return userGroup!.role as GroupRole;
    }
}

export default GroupService;