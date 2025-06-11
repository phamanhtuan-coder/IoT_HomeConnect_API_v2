import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError, AppError } from '../utils/errors';
import {GroupRole} from "../types/group";

const prisma = new PrismaClient();

/**
 * Middleware kiểm tra vai trò của người dùng trong một nhóm.
 *
 * - Lấy `groupId` từ params hoặc body
 * - Lấy `accountId` từ thông tin user đã xác thực
 * - Kiểm tra user có trong nhóm không và role của họ
 * - Thêm role vào request nếu hợp lệ
 */
export const groupRoleMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Lấy groupId từ params hoặc body
        const groupId = parseInt(req.params.groupId || req.body.groupId, 10);
        const accountId = req.user?.userId || req.user?.employeeId;

        // Validate input
        if (!accountId) {
            return next(AppError.create(ErrorCodes.UNAUTHORIZED, 'User not authenticated'));
        }
        if (!groupId || isNaN(groupId)) {
            return next(AppError.create(ErrorCodes.BAD_REQUEST, 'Valid Group ID is required'));
        }

        // Kiểm tra group và user_group
        const [group, userGroup] = await Promise.all([
            prisma.groups.findFirst({
                where: {
                    group_id: groupId,
                    is_deleted: false
                }
            }),
            prisma.user_groups.findFirst({
                where: {
                    group_id: groupId,
                    account_id: accountId,
                    is_deleted: false
                },
                select: {
                    role: true,
                    is_deleted: true
                }
            })
        ]);

        // Validate group tồn tại
        if (!group) {
            return next(AppError.create(ErrorCodes.NOT_FOUND, 'Group not found or has been deleted'));
        }

        // Validate user membership
        if (!userGroup || userGroup.is_deleted) {
            return next(AppError.create(ErrorCodes.FORBIDDEN, 'User is not a member of this group'));
        }

        // Validate role
        if (!userGroup.role) {
            return next(AppError.create(ErrorCodes.FORBIDDEN, 'User has no role in this group'));
        }

        // Thêm role vào request để các middleware/controller sau có thể sử dụng
        req.groupRole = userGroup.role as GroupRole;
        next();
    } catch (error) {
        next(AppError.create(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to verify group membership'));
    }
};
export default groupRoleMiddleware;