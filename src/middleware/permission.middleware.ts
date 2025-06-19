import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";
import redisClient from '../utils/redis';

const prisma = new PrismaClient();

export const checkEmployeePermission = async (req: Request, permissionId: number): Promise<boolean> => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return false;

    // Tìm account
    const account = await prisma.account.findFirst({
        where: {
            employee_id: employeeId,
            deleted_at: null,
            is_locked: false,
        },
    });

    if (!account || !account.role_id) return false;

    const redisKey = `role:${account.role_id}`;
    let permissions: number[] = [];

    // Kiểm tra Redis
    const cachedPermissions = await redisClient.get(redisKey);
    if (cachedPermissions) {
        permissions = JSON.parse(cachedPermissions);
    } else {
        const roleWithPermissions = await prisma.role.findUnique({
            where: { id: account.role_id },
            include: {
                permission_role: true,
            },
        });

        if (!roleWithPermissions) return false;

        permissions = roleWithPermissions.permission_role.map(p => p.permission_id);

        await redisClient.set(redisKey, JSON.stringify(permissions));
    }

    return permissions.includes(permissionId);
};

/**
 * Middleware kiểm tra quyền của nhân viên.
 *
 * Chỉ cho phép các tài khoản có quyền được truyền vào
 * Nếu không xác định được employeeId, trả về lỗi UNAUTHORIZED.
 * Nếu không tìm thấy tài khoản, trả về lỗi NOT_FOUND.
 * Nếu tài khoản không có quyền, trả về lỗi FORBIDDEN.
 *
 * @param requiredPermission - ID của quyền cần kiểm tra
 * @returns 
 */
export const authorizePermission = (requiredPermission: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const employeeId = req.user?.employeeId;
        
            const allowed = await checkEmployeePermission(employeeId, requiredPermission);
        
            if (!allowed) {
                return next(throwError(ErrorCodes.FORBIDDEN, 'Bạn không có quyền thực hiện chức năng này'));
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};