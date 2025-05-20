import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";

const prisma = new PrismaClient();

const roleMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
        throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');
    }

    const account = await prisma.account.findUnique({
        where: { account_id: employeeId },
        include: { role: true },
    });

    if (!account) {
        throwError(ErrorCodes.NOT_FOUND, 'Employee account not found');
    }

    if (!account!.role_id || !account!.role) {
        throwError(ErrorCodes.FORBIDDEN, 'Employee role not assigned');
    }

    const allowedRoles = ['ADMIN', 'TECHNICIAN'];
    if (!allowedRoles.includes(account!.role!.name!)) {
        throwError(ErrorCodes.FORBIDDEN, 'Only ADMIN or TECHNICIAN roles can perform this action');
    }

    next();
};

export const restrictToDeviceOwner = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId || req.user?.employeeId;
    const { device_serial } = req.body;

    if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

    const device = await prisma.devices.findUnique({
        where: { serial_number: device_serial, is_deleted: false },
    });

    if (!device || device.account_id !== userId) {
        throwError(ErrorCodes.FORBIDDEN, 'Only the device.ts owner can perform this action');
    }

    next();
};

export default roleMiddleware;