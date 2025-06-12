import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';

const prisma = new PrismaClient();

/**
 * Middleware để lấy groupId từ house cho các route của space
 */
export const spaceGroupMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let houseId: number | undefined;

        // Lấy houseId từ các nguồn khác nhau tùy theo route
        if (req.body.houseId) {
            // Cho route create space
            houseId = parseInt(req.body.houseId);
        } else if (req.params.houseId) {
            // Cho route get spaces by house
            houseId = parseInt(req.params.houseId);
        } else if (req.params.spaceId) {
            // Cho các route thao tác với space cụ thể
            const space = await prisma.spaces.findFirst({
                where: {
                    space_id: parseInt(req.params.spaceId),
                    is_deleted: false
                },
                select: {
                    house_id: true
                }
            });

            if (!space || !space.house_id) {
                return next(throwError(ErrorCodes.NOT_FOUND, 'Space not found or has no associated house'));
            }

            houseId = space.house_id;
        }

        if (!houseId) {
            return next(throwError(ErrorCodes.BAD_REQUEST, 'House ID is required'));
        }

        // Lấy group_id từ house
        const house = await prisma.houses.findFirst({
            where: {
                house_id: houseId,
                is_deleted: false
            },
            select: {
                group_id: true
            }
        });

        if (!house || !house.group_id) {
            return next(throwError(ErrorCodes.NOT_FOUND, 'House not found or has no associated group'));
        }

        // Thêm groupId vào request để groupRoleMiddleware có thể sử dụng
        req.params.groupId = house.group_id.toString();
        next();
    } catch (error) {
        next(error);
    }
};

export default spaceGroupMiddleware;
