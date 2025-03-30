import { PrismaClient } from '@prisma/client';
import { throwError, ErrorCodes } from '../utils/errors';
import { EmployeeRegisterRequestBody, EmployeeRole } from '../types/auth';

export class EmployeeService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async getEmployee(employeeId: number) {
        const employee = await this.prisma.employees.findUnique({ where: { EmployeeID: employeeId } });
        if (!employee) throwError(ErrorCodes.NOT_FOUND, 'Employee not found');
        return employee;
    }

    async getAllEmployees(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        const employees = await this.prisma.employees.findMany({
            where: { IsDeleted: false },
            skip,
            take: limit,
            orderBy: { CreatedAt: 'desc' },
        });
        const total = await this.prisma.employees.count({ where: { IsDeleted: false } });
        return { employees, total, page, limit };
    }

    async filterEmployees(filters: { role?: EmployeeRole; name?: string }, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        const employees = await this.prisma.employees.findMany({
            where: {
                IsDeleted: false,
                Role: filters.role,
                Name: filters.name ? { contains: filters.name } : undefined,
            },
            skip,
            take: limit,
            orderBy: { CreatedAt: 'desc' },
        });
        const total = await this.prisma.employees.count({
            where: {
                IsDeleted: false,
                Role: filters.role,
                Name: filters.name ? { contains: filters.name } : undefined,
            },
        });
        return { employees, total, page, limit };
    }

    async getEmployeePermissions(employeeId: number) {
        const permissions = await this.prisma.employeepermissions.findMany({
            where: { EmployeeID: employeeId, IsDeleted: false },
        });
        return permissions;
    }

    async getAllPermissions(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        const permissions = await this.prisma.employeepermissions.findMany({
            where: { IsDeleted: false },
            skip,
            take: limit,
            include: { employees: { select: { Name: true, Email: true } } },
        });
        const total = await this.prisma.employeepermissions.count({ where: { IsDeleted: false } });
        return { permissions, total, page, limit };
    }

    async updateEmployeePermission(permissionId: number, permissionType: string, adminId: number) {
        const admin = await this.prisma.employees.findUnique({ where: { EmployeeID: adminId } });
        if (!admin || admin.Role !== EmployeeRole.ADMIN) {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can update permissions');
        }
        const permission = await this.prisma.employeepermissions.update({
            where: { PermissionID: permissionId },
            data: { PermissionType: permissionType, UpdatedAt: new Date() },
        });
        return permission;
    }

    async deleteEmployeePermission(permissionId: number, adminId: number) {
        const admin = await this.prisma.employees.findUnique({ where: { EmployeeID: adminId } });
        if (!admin || admin.Role !== EmployeeRole.ADMIN) {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can delete permissions');
        }
        await this.prisma.employeepermissions.update({
            where: { PermissionID: permissionId },
            data: { IsDeleted: true },
        });
    }

    async updateEmployee(employeeId: number, data: Partial<EmployeeRegisterRequestBody>, adminId: number) {
        const admin = await this.prisma.employees.findUnique({ where: { EmployeeID: adminId } });
        if (!admin || admin.Role !== EmployeeRole.ADMIN) {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can update employees');
        }
        const employee = await this.prisma.employees.update({
            where: { EmployeeID: employeeId },
            data: { Name: data.name, Phone: data.phone, Role: data.role },
        });
        return employee;
    }

    async deleteEmployee(employeeId: number, adminId: number) {
        const admin = await this.prisma.employees.findUnique({ where: { EmployeeID: adminId } });
        if (!admin || admin.Role !== EmployeeRole.ADMIN) {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can delete employees');
        }
        await this.prisma.employees.update({
            where: { EmployeeID: employeeId },
            data: { IsDeleted: true },
        });
    }
}