import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { GroupRole } from '../types/auth';

const prisma = new PrismaClient();

export const groupRoleMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const groupId = parseInt(req.params.groupId || req.body.groupId, 10);
    const accountId = req.user?.userId || req.user?.employeeId;

    if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
    if (!groupId || isNaN(groupId)) throwError(ErrorCodes.BAD_REQUEST, 'Valid Group ID is required');

    try {
        const userGroup = await prisma.user_groups.findFirst({
            where: { group_id: groupId, account_id: accountId, is_deleted: false },
        });

        if (!userGroup || !userGroup.role) {
            throwError(ErrorCodes.FORBIDDEN, 'User is not a member of this group');
        }

        req.groupRole = userGroup!.role as GroupRole; // Ensure role is a valid GroupRole
        next();
    } catch (error) {
        throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to verify group membership');
    }
};

export default groupRoleMiddleware;