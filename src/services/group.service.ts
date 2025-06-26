import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import DeviceService from './device.service';
import {Group, GroupRole, UserGroup, GroupMember, GroupWithRole} from "../types/group";
import prisma from "../config/database";

class GroupService {
    private prisma: PrismaClient;
    private deviceService: DeviceService;

    constructor() {
        this.prisma = new PrismaClient();
        this.deviceService = new DeviceService();
    }

    async createGroup(
        group_name: string,
        ownerId: string,
        icon_name?: string,
        icon_color?: string,
        group_description?: string
    ): Promise<Group> {
        const group = await this.prisma.groups.create({
            data: {
                group_name,
                icon_name,
                icon_color,
                group_description
            },
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

    async updateGroup(
        groupId: number,
        data: {
            group_name?: string,
            icon_name?: string | null,
            icon_color?: string | null,
            group_description?: string | null
        }
    ): Promise<Group> {
        const group = await this.prisma.groups.update({
            where: { group_id: groupId, is_deleted: false },
            data: {
                ...data,
                updated_at: new Date()
            },
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
            // Soft delete user_groups
            this.prisma.user_groups.updateMany({
                where: { group_id: groupId },
                data: { is_deleted: true, updated_at: new Date() }
            }),
            // Soft delete houses
            this.prisma.houses.updateMany({
                where: { group_id: groupId },
                data: { is_deleted: true, updated_at: new Date() }
            }),
            // Update devices to remove them from group
            this.prisma.devices.updateMany({
                where: { group_id: groupId },
                data: { group_id: null, updated_at: new Date() }
            }),
            // Soft delete the group itself
            this.prisma.groups.update({
                where: { group_id: groupId },
                data: { is_deleted: true, updated_at: new Date() }
            }),
        ]);
    }

    async removeUserFromGroup(groupId: number, accountId: string): Promise<void> {
        const userGroup = await this.prisma.user_groups.findFirst({
            where: { group_id: groupId, account_id: accountId, is_deleted: false },
        });
        if (!userGroup) throwError(ErrorCodes.NOT_FOUND, 'User is not a member of this group');

        if (userGroup!.role === GroupRole.OWNER) {
            throwError(ErrorCodes.FORBIDDEN, 'Cannot remove the owner from the group');
        }

        await this.deviceService.removeViceDevicesFromGroup(groupId, accountId);

        await this.prisma.user_groups.delete({
            where: { user_group_id: userGroup!.user_group_id },
        });
    }

    async addUserToGroup(groupId: number, accountId: string, role: GroupRole): Promise<UserGroup> {
        if (role === GroupRole.OWNER) {
            throwError(ErrorCodes.FORBIDDEN, 'Cannot add another owner to the group');
        }

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
        if (role === GroupRole.OWNER) {
            throwError(ErrorCodes.FORBIDDEN, 'Cannot change role to owner');
        }

        const userGroup = await this.prisma.user_groups.findFirst({
            where: { group_id: groupId, account_id: accountId, is_deleted: false },
        });
        if (!userGroup) throwError(ErrorCodes.NOT_FOUND, 'User is not a member of this group');

        if (userGroup!.role === GroupRole.OWNER) {
            throwError(ErrorCodes.FORBIDDEN, 'Cannot change owner\'s role');
        }

        const updatedUserGroup = await this.prisma.user_groups.update({
            where: { user_group_id: userGroup!.user_group_id },
            data: { role, updated_at: new Date() },
        });

        return this.mapPrismaUserGroupToAuthUserGroup(updatedUserGroup);
    }

    async getUserGroupRole(groupId: number, accountId: string): Promise<GroupRole | null> {
        const userGroup = await this.prisma.user_groups.findFirst({
            where: {
                group_id: groupId,
                account_id: accountId,
                is_deleted: false
            },
            select: {
                role: true
            }
        });

        return userGroup?.role as GroupRole || null;
    }

    async getGroupsByUserRole(accountId: string, roles: GroupRole[]): Promise<GroupWithRole[]> {
        const userGroups = await this.prisma.user_groups.findMany({
            where: {
                account_id: accountId,
                role: {
                    in: roles
                },
                is_deleted: false
            },
            include: {
                groups: true
            }
        });

        return userGroups
            .filter(ug => ug.groups && !ug.groups.is_deleted)
            .map(ug => ({
                group_id: ug.groups!.group_id,
                group_name: ug.groups!.group_name,
                group_description: ug.groups!.group_description,
                icon_name: ug.groups!.icon_name,
                icon_color: ug.groups!.icon_color,
                created_at: ug.groups!.created_at,
                updated_at: ug.groups!.updated_at,
                is_deleted: ug.groups!.is_deleted,
                role: ug.role as GroupRole
            }));
    }

    async getUserRole(groupId: number, accountId: string): Promise<GroupRole | null> {
        const userGroup = await this.prisma.user_groups.findFirst({
            where: {
                group_id: groupId,
                account_id: accountId,
                is_deleted: false
            }
        });
        return userGroup?.role as GroupRole || null;
    }

    async getGroupsByUsername(username: string, userId: string): Promise<Group[]> {
        const account = await this.prisma.account.findFirst({
            where: {
                username: username,
                account_id: userId,
                deleted_at: null
            }
        });

        if (!account) {
            throwError(ErrorCodes.UNAUTHORIZED, 'Invalid user credentials');
        }

        const userGroups = await this.prisma.user_groups.findMany({
            where: {
                account_id: userId,
                is_deleted: false
            },
            include: {
                groups: true
            }
        });

        if (!userGroups.length) return [];

        return userGroups
            .filter(ug => ug.groups && !ug.groups.is_deleted)
            .map(ug => ({
                group_id: ug.groups!.group_id,
                group_name: ug.groups!.group_name,
                group_description: ug.groups!.group_description,
                icon_name: ug.groups!.icon_name,
                icon_color: ug.groups!.icon_color,
                created_at: ug.groups!.created_at,
                updated_at: ug.groups!.updated_at,
                is_deleted: ug.groups!.is_deleted,
                role: ug.role as GroupRole
            }));
    }

    async getUsersInGroup(groupId: number): Promise<GroupMember[]> {
        const userGroups = await this.prisma.user_groups.findMany({
            where: {
                group_id: groupId,
                is_deleted: false
            },
            include: {
                account: {
                    include: {
                        customer: true
                    }
                }
            }
        });

        return userGroups.map(ug => ({
            user_group_id: ug.user_group_id,
            account_id: ug.account_id!,
            group_id: ug.group_id!,
            role: ug.role as GroupRole,
            joined_at: ug.joined_at,
            username: ug.account?.username ?? null,
            email: ug.account?.customer?.email ?? null,
            full_name: ug.account?.customer ?
                `${ug.account.customer.surname || ''} ${ug.account.customer.lastname || ''}`.trim() : null,
            avatar: ug.account?.customer?.image ?? null
        }));
    }

    private mapPrismaGroupToAuthGroup(group: any): Group {
        return {
            group_id: group.group_id,
            group_name: group.group_name,
            icon_name: group.icon_name ?? null,
            icon_color: group.icon_color ?? null,
            group_description: group.group_description ?? null,
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
