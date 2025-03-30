import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import { EmployeeRegisterRequestBody, EmployeeRole } from '../types/auth';
import { throwError, ErrorCodes } from '../utils/errors';

export class EmployeeController {
    private employeeService: EmployeeService;

    constructor() {
        this.employeeService = new EmployeeService();
    }

    getEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = parseInt(req.params.id, 10);
        const requester = req.user;

        // Allow employee to view their own info or admin to view any employee
        if (!requester || (!requester.userId && requester.employeeId !== employeeId && requester.role !== 'admin')) {
            throwError(ErrorCodes.FORBIDDEN, 'You can only view your own info or must be an admin');
        }

        const employee = await this.employeeService.getEmployee(employeeId);
        res.json(employee);
    };

    getAllEmployees = async (req: Request, res: Response, next: NextFunction) => {
        const requester = req.user;
        if (!requester || requester.role !== 'admin') {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can view all employees');
        }

        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const result = await this.employeeService.getAllEmployees(page, limit);
        res.json(result);
    };

    filterEmployees = async (req: Request, res: Response, next: NextFunction) => {
        const requester = req.user;
        if (!requester || requester.role !== 'admin') {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can filter employees');
        }

        const { role, name } = req.query;
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const filters = {
            role: role ? (role as EmployeeRole) : undefined,
            name: name ? (name as string) : undefined,
        };
        const result = await this.employeeService.filterEmployees(filters, page, limit);
        res.json(result);
    };

    getEmployeePermissions = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = parseInt(req.params.id, 10);
        const requester = req.user;

        // Allow employee to view their own permissions or admin to view any
        if (!requester || (!requester.userId && requester.employeeId !== employeeId && requester.role !== 'admin')) {
            throwError(ErrorCodes.FORBIDDEN, 'You can only view your own permissions or must be an admin');
        }

        const permissions = await this.employeeService.getEmployeePermissions(employeeId);
        res.json(permissions);
    };

    getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
        const requester = req.user;
        if (!requester || requester.role !== 'admin') {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can view all permissions');
        }

        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const result = await this.employeeService.getAllPermissions(page, limit);
        res.json(result);
    };

    updateEmployeePermission = async (req: Request, res: Response, next: NextFunction) => {
        const permissionId = parseInt(req.params.permissionId, 10);
        const { permissionType } = req.body;
        const adminId = req.user?.employeeId!;
        const updatedPermission = await this.employeeService.updateEmployeePermission(permissionId, permissionType, adminId);
        res.json(updatedPermission);
    };

    deleteEmployeePermission = async (req: Request, res: Response, next: NextFunction) => {
        const permissionId = parseInt(req.params.permissionId, 10);
        const adminId = req.user?.employeeId!;
        await this.employeeService.deleteEmployeePermission(permissionId, adminId);
        res.status(204).send();
    };

    updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = parseInt(req.params.id, 10);
        const requester = req.user;

        // Only admins can update employees
        if (!requester || requester.role !== 'admin') {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can update employees');
        }

        const data = req.body as Partial<EmployeeRegisterRequestBody>;
        const adminId = requester!.employeeId!;
        const updatedEmployee = await this.employeeService.updateEmployee(employeeId, data, adminId);
        res.json(updatedEmployee);
    };

    deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = parseInt(req.params.id, 10);
        const adminId = req.user?.employeeId!;
        await this.employeeService.deleteEmployee(employeeId, adminId);
        res.status(204).send();
    };
}