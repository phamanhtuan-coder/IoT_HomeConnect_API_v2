import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';

const prisma = new PrismaClient();

/**
 * Middleware để lấy groupId từ space thông qua house
 */
export const spaceGroupMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let spaceId: number | undefined;

        // Lấy spaceId từ các nguồn khác nhau tùy theo route
        if (req.body.spaceId) {
            spaceId = parseInt(req.body.spaceId);
        } else if (req.params.spaceId) {
            spaceId = parseInt(req.params.spaceId);
        }

        if (!spaceId) {
            return next(throwError(ErrorCodes.BAD_REQUEST, 'Space ID is required'));
        }

        // Lấy house_id từ space và sau đó lấy group_id từ house
        const space = await prisma.spaces.findFirst({
            where: {
                space_id: spaceId,
                is_deleted: false
            },
            include: {
                houses: {
                    select: {
                        group_id: true
                    }
                }
            }
        });

        if (!space || !space.houses?.group_id) {
            return next(throwError(ErrorCodes.NOT_FOUND, 'Space not found or has no associated group'));
        }

        // Thêm groupId vào request để groupRoleMiddleware có thể sử dụng
        req.params.groupId = space.houses.group_id.toString();
        next();
    } catch (error) {
        next(error);
    }
};

export default spaceGroupMiddleware;
