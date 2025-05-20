import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError, AppError } from '../utils/errors';
import {GroupRole} from "../types/group";

const prisma = new PrismaClient();

/**
 * Middleware kiểm tra vai trò của người dùng trong một nhóm.
 *
 * - Lấy `groupId` từ params hoặc body, và `accountId` từ thông tin user.
 * - Nếu thiếu thông tin xác thực hoặc groupId không hợp lệ, trả về lỗi tương ứng.
 * - Truy vấn bảng `user_groups` để xác định vai trò của user trong nhóm.
 * - Nếu user không phải thành viên nhóm hoặc không có vai trò, trả về lỗi FORBIDDEN.
 * - Nếu thành công, gán vai trò vào `req.groupRole` và gọi `next()`.
 *
 * @param req Request từ Express, yêu cầu phải có user đã xác thực.
 * @param res Response từ Express.
 * @param next Hàm next để chuyển sang middleware tiếp theo hoặc xử lý lỗi.
 */
export const groupRoleMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const groupId = parseInt(req.params.groupId || req.body.groupId, 10);
    const accountId = req.user?.userId || req.user?.employeeId;

    if (!accountId) return next(AppError.create(ErrorCodes.UNAUTHORIZED, 'User not authenticated'));
    if (!groupId || isNaN(groupId)) return next(AppError.create(ErrorCodes.BAD_REQUEST, 'Valid Group ID is required'));

    try {
        const userGroup = await prisma.user_groups.findFirst({
            where: { group_id: groupId, account_id: accountId, is_deleted: false },
        });

        if (!userGroup || !userGroup.role) {
            return next(AppError.create(ErrorCodes.FORBIDDEN, 'User is not a member of this group'));
        }

        req.groupRole = userGroup.role as GroupRole;
        next();
    } catch (error) {
        next(AppError.create(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to verify group membership'));
    }
};
export default groupRoleMiddleware;