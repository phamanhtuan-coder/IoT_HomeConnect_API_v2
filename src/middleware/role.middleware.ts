import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";

const prisma = new PrismaClient();

const roleMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
        throwError(ErrorCodes.UNAUTHORIZED, "Employee not authenticated");
    }

    const account = await prisma.account.findUnique({
        where: { account_id: employeeId },
        include: { role: true },
    });

    if (!account) {
        throwError(ErrorCodes.NOT_FOUND, "Employee account not found");
    }

    if (!account!.role_id || !account!.role) {
        throwError(ErrorCodes.FORBIDDEN, "Employee role not assigned");
    }

    // Chỉ cho phép role ADMIN hoặc TECHNICIAN thực hiện các thao tác
    const allowedRoles = ["ADMIN", "TECHNICIAN"];
    // @ts-ignore
    if (!allowedRoles.includes(account!.role!.name)) {
        throwError(
            ErrorCodes.FORBIDDEN,
            "Only ADMIN or TECHNICIAN roles can perform this action"
        );
    }

    next();
};

export default roleMiddleware;