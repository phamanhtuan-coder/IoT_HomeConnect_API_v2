import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';

const prisma = new PrismaClient();

/**
 * Middleware để lấy groupId từ space hoặc house
 */
export const spaceGroupMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Kiểm tra nếu có houseId trong params
        if (req.params.houseId) {
            const houseId = parseInt(req.params.houseId);
            const house = await prisma.houses.findFirst({
                where: {
                    house_id: houseId,
                    is_deleted: false
                },
                select: {
                    group_id: true
                }
            });

            if (!house) {
                return next(throwError(ErrorCodes.NOT_FOUND, 'House not found'));
            }

            if (house.group_id == null) {
                return next(throwError(ErrorCodes.NOT_FOUND, 'Group ID not found for the specified house'));
            }

            req.params.groupId = house.group_id.toString();
            return next();
        }

        // Xử lý trường hợp có spaceId
        let spaceId: number | undefined;
        if (req.body.spaceId) {
            spaceId = parseInt(req.body.spaceId);
        } else if (req.params.spaceId) {
            spaceId = parseInt(req.params.spaceId);
        }

        if (!spaceId) {
            return next(throwError(ErrorCodes.BAD_REQUEST, 'Space ID is required'));
        }

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

        req.params.groupId = space.houses.group_id.toString();
        next();
    } catch (error) {
        next(error);
    }
};

export default spaceGroupMiddleware;
