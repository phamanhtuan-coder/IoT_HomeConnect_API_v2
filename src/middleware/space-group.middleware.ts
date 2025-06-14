import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';

const prisma = new PrismaClient();

/**
 * Middleware để lấy groupId từ space hoặc house
 */
export const spaceGroupMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // POST request - creating new space
        if (req.method === 'POST') {
            const houseId = req.params.houseId ? parseInt(req.params.houseId) : req.body.house_id;

            if (!houseId) {
                return next(throwError(ErrorCodes.BAD_REQUEST, 'House ID is required when creating a space'));
            }

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

            req.params.groupId = house.group_id!.toString();
            return next();
        }

        // For other requests (GET, PUT, DELETE) - check spaceId first
        const spaceId = req.params.spaceId ? parseInt(req.params.spaceId) : undefined;
        const houseId = req.params.houseId ? parseInt(req.params.houseId) : undefined;

        // If we have houseId (for routes like GET /house/:houseId)
        if (houseId) {
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

            req.params.groupId = house.group_id!.toString();
            return next();
        }

        // If we have spaceId (for routes like GET /:spaceId)
        if (spaceId) {
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
            return next();
        }

        return next(throwError(ErrorCodes.BAD_REQUEST, 'Either Space ID or House ID is required'));
    } catch (error) {
        next(error);
    }
};

export default spaceGroupMiddleware;
