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

        const house = await this.prisma.houses.create({
            data: { 
                group_id: groupId,
                house_name,
                address,
                icon_name,
                icon_color
            },
        });

        // Create default space with some default values
        await this.prisma.spaces.create({
            data: {
                house_id: house!.house_id,
                space_name: 'Phòng Mặc Định',
                icon_name: 'home',
                icon_color: '#4A90E2',
                space_description: 'Không gian mặc định của ngôi nhà'
            },
        });

        return {
            house_id: house!.house_id,
            group_id: house!.group_id || null,
            house_name: house!.house_name,
            address: house!.address || null,
            icon_name: house!.icon_name || null,
            icon_color: house!.icon_color || null,
            created_at: house!.created_at || null,
            updated_at: house!.updated_at || null,
            is_deleted: house!.is_deleted || null,
        };
    }

    async getHousesByGroup(groupId: number): Promise<House[]> {
        const houses = await this.prisma.houses.findMany({
            where: { group_id: groupId, is_deleted: false },
            include: { spaces: { where: { is_deleted: false }, select: { space_id: true, space_name: true } } },
        });

        return houses.map((house) => ({
            house_id: house!.house_id,
            group_id: house!.group_id || null,
            house_name: house!.house_name,
            address: house!.address || null,
            icon_name: house!.icon_name || null,
            icon_color: house!.icon_color || null,
            created_at: house!.created_at || null,
            updated_at: house!.updated_at || null,
            is_deleted: house!.is_deleted || null,
        }));
    }

    async getHouseById(houseId: number): Promise<House> {
        const house = await this.prisma.houses.findFirst({
            where: { house_id: houseId, is_deleted: false },
            include: { spaces: { where: { is_deleted: false }, select: { space_id: true, space_name: true } } },
        });
        if (!house) throwError(ErrorCodes.NOT_FOUND, 'House not found');

        return {
            house_id: house!.house_id,
            group_id: house!.group_id || null,
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
            where: { house_id: houseId },
            data: { ...input, updated_at: new Date() },
        });

        return {
            house_id: house!.house_id,
            group_id: house!.group_id || null,
            house_name: house!.house_name,
            address: house!.address || null,
            icon_name: house!.icon_name || null,
            icon_color: house!.icon_color || null,
            created_at: house!.created_at || null,
            updated_at: house!.updated_at || null,
            is_deleted: house!.is_deleted || null,
        };
    }

    async deleteHouse(houseId: number): Promise<void> {
        // Check for existing spaces
        const spaceCount = await this.prisma.spaces.count({
            where: { house_id: houseId, is_deleted: false }
        });
        if (spaceCount > 0) throwError(ErrorCodes.BAD_REQUEST, 'Cannot delete house with existing spaces');

        await this.prisma.houses.update({
            where: { house_id: houseId },
            data: { is_deleted: true, updated_at: new Date() },
        });
    }
}

export default HouseService;