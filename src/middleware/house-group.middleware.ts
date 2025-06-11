import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';

const prisma = new PrismaClient();

/**
 * Middleware để lấy groupId từ house
 */
export const houseGroupMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let groupId: number | undefined;

        if (req.method === 'POST') {
            // For create house
            groupId = req.body.groupId;
        } else if (req.params.houseId) {
            // For other operations (update, delete, get)
            const house = await prisma.houses.findFirst({
                where: {
                    house_id: parseInt(req.params.houseId),
                    is_deleted: false
                },
                select: {
                    group_id: true
                }
            });

            if (!house) {
                return next(throwError(ErrorCodes.NOT_FOUND, 'House not found'));
            }

            if (!house.group_id) {
                return next(throwError(ErrorCodes.BAD_REQUEST, 'House has no associated group'));
            }

            groupId = house.group_id;
        }

        if (!groupId) {
            return next(throwError(ErrorCodes.BAD_REQUEST, 'Group ID is required'));
        }

        // Add groupId to request for groupRoleMiddleware
        req.params.groupId = groupId.toString();
        next();
    } catch (error) {
        next(error);
    }
};

export default houseGroupMiddleware;
