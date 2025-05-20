import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import DeviceService from './device.service';
import {Group, GroupRole, UserGroup} from "../types/group";

class GroupService {
    private prisma: PrismaClient;
    private deviceService: DeviceService;

    constructor() {
        this.prisma = new PrismaClient();
        this.deviceService = new DeviceService();
    }

    async createGroup(group_name: string, ownerId: string): Promise<Group> {
        const group = await this.prisma.groups.create({
            data: { group_name },
        });

        await this.prisma.user_groups.create({
            data: {
                account_id: ownerId,
                group_id: group.group_id,
                role: GroupRole.OWNER,
            },
        });

        return this.mapPrismaGroupToAuthGroup(group);
    }

    async getGroup(groupId: number): Promise<Group> {
        const group = await this.prisma.groups.findUnique({
            where: { group_id: groupId, is_deleted: false },
        });
        if (!group) throwError(ErrorCodes.NOT_FOUND, 'Group not found');

        return this.mapPrismaGroupToAuthGroup(group);
    }

    async updateGroupName(groupId: number, group_name: string): Promise<Group> {
        const group = await this.prisma.groups.update({
            where: { group_id: groupId, is_deleted: false },
            data: { group_name, updated_at: new Date() },
        });
        if (!group) throwError(ErrorCodes.NOT_FOUND, 'Group not found');

        return this.mapPrismaGroupToAuthGroup(group);
    }

    async deleteGroup(groupId: number): Promise<void> {
        const group = await this.prisma.groups.findUnique({
            where: { group_id: groupId, is_deleted: false },
        });
        if (!group) throwError(ErrorCodes.NOT_FOUND, 'Group not found');

        const viceUsers = await this.prisma.user_groups.findMany({
            where: { group_id: groupId, role: GroupRole.VICE, is_deleted: false },
        });
        for (const user of viceUsers) {
            await this.deviceService.removeViceDevicesFromGroup(groupId, user.account_id!);
        }

        await this.prisma.$transaction([
            this.prisma.user_groups.deleteMany({ where: { group_id: groupId } }),
            this.prisma.houses.updateMany({ where: { group_id: groupId }, data: { is_deleted: true } }),
            this.prisma.groups.delete({ where: { group_id: groupId } }),
        ]);
    }

    async removeUserFromGroup(groupId: number, accountId: string): Promise<void> {
        const userGroup = await this.prisma.user_groups.findFirst({
            where: { group_id: groupId, account_id: accountId, is_deleted: false },
        });
        if (!userGroup) throwError(ErrorCodes.NOT_FOUND, 'User is not a member of this group');

        await this.deviceService.removeViceDevicesFromGroup(groupId, accountId);

        await this.prisma.user_groups.delete({
            where: { user_group_id: userGroup!.user_group_id },
        });
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
        if (existingUserGroup) throwError(ErrorCodes.CONFLICT, 'User is already a member of this group');

        const userGroup = await this.prisma.user_groups.create({
            data: {
                account_id: accountId,
                group_id: groupId,
                role,
            },
        });

        return this.mapPrismaUserGroupToAuthUserGroup(userGroup);
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

        return this.mapPrismaUserGroupToAuthUserGroup(updatedUserGroup);
    }

    async getUserRole(groupId: number, accountId: string): Promise<GroupRole> {
        const userGroup = await this.prisma.user_groups.findFirst({
            where: { group_id: groupId, account_id: accountId, is_deleted: false },
        });
        if (!userGroup || !userGroup.role) throwError(ErrorCodes.NOT_FOUND, 'User is not a member of this group');

        return userGroup!.role as GroupRole;
    }

    private mapPrismaGroupToAuthGroup(group: any): Group {
        return {
            group_id: group.group_id,
            group_name: group.group_name,
            created_at: group.created_at ?? null,
            updated_at: group.updated_at ?? null,
            is_deleted: group.is_deleted ?? null,
        };
    }

    private mapPrismaUserGroupToAuthUserGroup(userGroup: any): UserGroup {
        return {
            user_group_id: userGroup.user_group_id,
            account_id: userGroup.account_id ?? null,
            group_id: userGroup.group_id ?? null,
            role: userGroup.role as GroupRole | null,
            joined_at: userGroup.joined_at ?? null,
            updated_at: userGroup.updated_at ?? null,
            is_deleted: userGroup.is_deleted ?? null,
        };
    }
}

export default GroupService;