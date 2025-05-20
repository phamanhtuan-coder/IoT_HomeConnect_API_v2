import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import {House} from "../types/house";

class HouseService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createHouse(input: {
        groupId: number;
        house_name: string;
        address?: string;
        icon_name?: string;
        icon_color?: string;
    }): Promise<House> {
        const { groupId, house_name, address, icon_name, icon_color } = input;

        // Verify group exists
        const group = await this.prisma.groups.findUnique({
            where: { group_id: groupId, is_deleted: false },
        });
        if (!group) throwError(ErrorCodes.NOT_FOUND, 'Group not found');

        const house = await this.prisma.houses.create({
            data: { group_id: groupId, house_name, address, icon_name, icon_color },
        });

        // Create default space
        await this.prisma.spaces.create({
            data: { house_id: house.house_id, space_name: 'Phòng Mặc Định' },
        });

        return {
            ...house,
            group_id: house.group_id || null,
            house_name: house.house_name,
            address: house.address || null,
            icon_name: house.icon_name || null,
            icon_color: house.icon_color || null,
            created_at: house.created_at || null,
            updated_at: house.updated_at || null,
            is_deleted: house.is_deleted || null,
        };
    }

    async getHousesByGroup(groupId: number): Promise<House[]> {
        const houses = await this.prisma.houses.findMany({
            where: { group_id: groupId, is_deleted: false },
            include: { spaces: { where: { is_deleted: false }, select: { space_id: true, space_name: true } } },
        });

        return houses.map((house) => ({
            ...house,
            group_id: house.group_id || null,
            house_name: house.house_name,
            address: house.address || null,
            icon_name: house.icon_name || null,
            icon_color: house.icon_color || null,
            created_at: house.created_at || null,
            updated_at: house.updated_at || null,
            is_deleted: house.is_deleted || null,
        }));
    }

    async getHouseById(houseId: number): Promise<House> {
        const house = await this.prisma.houses.findUnique({
            where: { house_id: houseId, is_deleted: false },
            include: { spaces: { where: { is_deleted: false }, select: { space_id: true, space_name: true } } },
        });
        if (!house) throwError(ErrorCodes.NOT_FOUND, 'House not found');

        return {
            ...house,
            group_id: house!.group_id || null,
            house_id: house!.house_id ,
            house_name: house!.house_name,
            address: house!.address || null,
            icon_name: house!.icon_name || null,
            icon_color: house!.icon_color || null,
            created_at: house!.created_at || null,
            updated_at: house!.updated_at || null,
            is_deleted: house!.is_deleted || null,
        };
    }

    async updateHouse(houseId: number, input: {
        house_name?: string;
        address?: string;
        icon_name?: string;
        icon_color?: string;
    }): Promise<House> {
        const house = await this.prisma.houses.update({
            where: { house_id: houseId, is_deleted: false },
            data: { ...input, updated_at: new Date() },
        });
        if (!house) throwError(ErrorCodes.NOT_FOUND, 'House not found');

        return {
            ...house,
            group_id: house.group_id || null,
            house_name: house.house_name,
            address: house.address || null,
            icon_name: house.icon_name || null,
            icon_color: house.icon_color || null,
            created_at: house.created_at || null,
            updated_at: house.updated_at || null,
            is_deleted: house.is_deleted || null,
        };
    }

    async deleteHouse(houseId: number): Promise<void> {
        const house = await this.prisma.houses.findUnique({
            where: { house_id: houseId, is_deleted: false },
        });
        if (!house) throwError(ErrorCodes.NOT_FOUND, 'House not found');

        const spaceCount = await this.prisma.spaces.count({ where: { house_id: houseId, is_deleted: false } });
        if (spaceCount > 0) throwError(ErrorCodes.BAD_REQUEST, 'Cannot delete house with existing spaces');

        await this.prisma.houses.update({
            where: { house_id: houseId },
            data: { is_deleted: true, updated_at: new Date() },
        });
    }
}

export default HouseService;