import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import {EmployeeRole, UserRegisterRequestBody} from '../types/auth';
import { throwError, ErrorCodes } from '../utils/errors';

export class UserController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    getUser = async (req: Request, res: Response, next: NextFunction) => {
        const userId = parseInt(req.params.id, 10);
        const requester = req.user; // From authMiddleware

        // Allow user to view their own info or admin to view any user
        if (!requester || (requester.userId !== userId && requester.role !== 'admin')) {
            throwError(ErrorCodes.FORBIDDEN, 'You can only view your own info or must be an admin');
        }

        const user = await this.userService.getUser(userId);
        res.json(user);
    };

    getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
        const requester = req.user;
        const authorizedRoles = [EmployeeRole.ADMIN];
        if (!requester || !authorizedRoles.includes(requester.role as EmployeeRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Unauthorized role');
        }

        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;
        const result = await this.userService.getAllUsers(page, limit);
        res.json(result);
    };

    updateUser = async (req: Request, res: Response, next: NextFunction) => {
        const userId = parseInt(req.params.id, 10);
        const requester = req.user;

        // Allow user to update their own info or admin to update any user
        if (!requester || (requester.userId !== userId && requester.role !== 'admin')) {
            throwError(ErrorCodes.FORBIDDEN, 'You can only update your own info or must be an admin');
        }

        const data = req.body as Partial<UserRegisterRequestBody>;
        const updatedUser = await this.userService.updateUser(userId, data);
        res.json(updatedUser);
    };

    deleteUser = async (req: Request, res: Response, next: NextFunction) => {
        const userId = parseInt(req.params.id, 10);
        const requester = req.user;

        // Only admins can delete users
        if (!requester || requester.role !== 'admin') {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can delete users');
        }

        await this.userService.deleteUser(userId);
        res.status(204).send();
    };
}