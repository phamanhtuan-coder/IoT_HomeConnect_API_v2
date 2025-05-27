import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";

const prisma = new PrismaClient();

/**
 * Middleware kiểm tra vai trò của nhân viên.
 *
 * Chỉ cho phép các tài khoản có vai trò 'ADMIN' hoặc 'TECHNICIAN' thực hiện hành động tiếp theo.
 * Nếu không xác định được employeeId, trả về lỗi UNAUTHORIZED.
 * Nếu không tìm thấy tài khoản, trả về lỗi NOT_FOUND.
 * Nếu tài khoản không có vai trò, trả về lỗi FORBIDDEN.
 * Nếu vai trò không thuộc allowedRoles, trả về lỗi FORBIDDEN.
 *
 * @param req - Đối tượng Request của Express, yêu cầu phải có user với employeeId.
 * @param res - Đối tượng Response của Express.
 * @param next - Hàm next để chuyển sang middleware tiếp theo nếu hợp lệ.
 * @throws UNAUTHORIZED nếu không xác định được employeeId.
 * @throws NOT_FOUND nếu không tìm thấy tài khoản.
 * @throws FORBIDDEN nếu tài khoản không có vai trò hoặc vai trò không hợp lệ.
 */
const roleMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const employeeId = req.user?.employeeId;
        if (!employeeId) {
            return next(throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated'));
        }

        const account = await prisma.account.findUnique({
            where: { account_id: employeeId },
            include: { role: true },
        });

        if (!account) {
            return next(throwError(ErrorCodes.NOT_FOUND, 'Employee account not found'));
        }

        if (!account.role_id || !account.role) {
            return next(throwError(ErrorCodes.FORBIDDEN, 'Employee role not assigned'));
        }

        const allowedRoles = ['ADMIN', 'PRODUCTION', 'TECHNICIAN', 'RND', 'EMPLOYEE'];
        if (!allowedRoles.includes(account.role.name!)) {
            return next(throwError(ErrorCodes.FORBIDDEN, 'Only allowed employee roles can perform this action'));
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware kiểm tra quyền sở hữu thiết bị.
 *
 * Chỉ cho phép người dùng là chủ sở hữu của thiết bị (dựa vào userId/employeeId và device_serial)
 * thực hiện các hành động tiếp theo. Nếu không phải chủ sở hữu, trả về lỗi FORBIDDEN.
 *
 * @param req - Đối tượng Request của Express, yêu cầu phải có user và device_serial trong body.
 * @param res - Đối tượng Response của Express.
 * @param next - Hàm next để chuyển sang middleware tiếp theo nếu hợp lệ.
 * @throws UNAUTHORIZED nếu không xác định được user.
 * @throws FORBIDDEN nếu user không phải chủ sở hữu thiết bị.
 */
export const restrictToDeviceOwner = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId || req.user?.employeeId;
        const { device_serial } = req.body;

        if (!userId) {
            return next(throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated'));
        }

        const device = await prisma.devices.findUnique({
            where: { serial_number: device_serial, is_deleted: false },
        });

        if (!device || device.account_id !== userId) {
            return next(throwError(ErrorCodes.FORBIDDEN, 'Only the device owner can perform this action'));
        }

        next();
    } catch (error) {
        next(error);
    }
};

export default roleMiddleware;