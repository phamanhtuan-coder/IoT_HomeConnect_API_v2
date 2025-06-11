import { Request, Response, NextFunction } from 'express';
import { ErrorCodes, throwError } from '../utils/errors';
import {GroupRole} from "../types/group";
import { PrismaClient } from '@prisma/client';
import SpaceService from "../services/space.service";

class SpaceController {
    private spaceService: SpaceService;
    private prisma: PrismaClient;

    constructor() {
        this.spaceService = new SpaceService();
        this.prisma = new PrismaClient();
    }

    /**
     * Helper method to get house and its group ID
     */
    private async getHouseWithGroup(houseId: number) {
        const house = await this.prisma.houses!.findFirst({
            where: { house_id: houseId, is_deleted: false },
            select: { group_id: true }
        });

        if (!house || house.group_id === null) {
            throwError(ErrorCodes.NOT_FOUND, 'House not found or has no associated group');
        }

        return house!.group_id;
    }

    /**
     * Helper method to get space with its house and group info
     */
    private async getSpaceWithHouseGroup(spaceId: number) {
        const space = await this.prisma.spaces.findFirst({
            where: { space_id: spaceId, is_deleted: false },
            include: {
                houses: {
                    select: {
                        group_id: true
                    }
                }
            }
        });

        if (!space) {
            throwError(ErrorCodes.NOT_FOUND, 'Space not found');
        }
        if (!space!.houses || !space!.houses!.group_id) {
            throwError(ErrorCodes.NOT_FOUND, 'Space has no associated house or group');
        }

        return {
            space,
            groupId: space!.houses!.group_id
        };
    }

    /**
     * Tạo không gian mới
     * @param req Request Express với thông tin không gian trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    createSpace = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { houseId, space_name, icon_name, icon_color, space_description } = req.body;
            
            // Get group ID from house and add to request
            const groupId = await this.getHouseWithGroup(houseId);
            req.body.groupId = groupId;

            if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
                throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can create spaces');
            }

            const space = await this.spaceService.createSpace({
                houseId,
                space_name,
                icon_name,
                icon_color,
                space_description
            });
            
            res.status(201).json(space);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách không gian theo nhà
     * @param req Request Express với ID nhà trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getSpacesByHouse = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const houseId = parseInt(req.params.houseId);
            
            // Get group ID from house and add to request
            const groupId = await this.getHouseWithGroup(houseId);
            req.params.groupId = groupId!.toString();

            const spaces = await this.spaceService.getSpacesByHouse(houseId);
            res.json(spaces);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thông tin không gian theo ID
     * @param req Request Express với ID không gian trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getSpaceById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const spaceId = parseInt(req.params.spaceId);
            const { space, groupId } = await this.getSpaceWithHouseGroup(spaceId);
            
            // Add group ID to request for middleware
            req.params.groupId = groupId!.toString();

            res.json(space);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật thông tin không gian
     * @param req Request Express với ID không gian trong params và thông tin cập nhật trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateSpace = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const spaceId = parseInt(req.params.spaceId);
            const { space_name, icon_name, icon_color, space_description } = req.body;
            
            const { groupId } = await this.getSpaceWithHouseGroup(spaceId);
            req.params.groupId = groupId!.toString();

            if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
                throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can update spaces');
            }

            const updatedSpace = await this.spaceService.updateSpace(
                spaceId,
                { space_name, icon_name, icon_color, space_description }
            );
            res.json(updatedSpace);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xóa không gian
     * @param req Request Express với ID không gian trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    deleteSpace = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const spaceId = parseInt(req.params.spaceId);
            
            const { groupId } = await this.getSpaceWithHouseGroup(spaceId);
            req.params.groupId = groupId!.toString();

            if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
                throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can delete spaces');
            }

            await this.spaceService.deleteSpace(spaceId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy tên không gian
     * @param req Request Express với ID không gian trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getSpaceName = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const spaceId = parseInt(req.params.spaceId);
            
            const { groupId } = await this.getSpaceWithHouseGroup(spaceId);
            req.params.groupId = groupId!.toString();

            const name = await this.spaceService.getSpaceName(spaceId);
            res.json({ success: true, name });
        } catch (error) {
            next(error);
        }
    };
}

export default SpaceController;
