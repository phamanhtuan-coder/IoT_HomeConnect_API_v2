// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth.service';
import { LoginRequestBody, UserRegisterRequestBody, EmployeeRegisterRequestBody } from '../types/auth';

class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    loginUser = async (req: Request, res: Response, next: NextFunction) => {
        const { email, password, rememberMe } = req.body as LoginRequestBody;
        const tokens = await this.authService.loginUser({ email, password, rememberMe });
        res.json(tokens);
    };

    loginEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const { email, password, rememberMe } = req.body as LoginRequestBody;
        const tokens = await this.authService.loginEmployee({ email, password, rememberMe });
        res.json(tokens);
    };

    refreshToken = async (req: Request, res: Response, next: NextFunction) => {
        const { refreshToken } = req.body;
        const accessToken = await this.authService.refreshToken(refreshToken);
        res.json({ accessToken });
    };

    registerUser = async (req: Request, res: Response, next: NextFunction) => {
        const data = req.body as UserRegisterRequestBody;
        const token = await this.authService.registerUser(data);
        res.status(201).json({ token });
    };

    registerEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const data = req.body as EmployeeRegisterRequestBody;
        const adminId = req.user?.employeeId; // Assumes admin is authenticated
        if (!adminId) throw new Error('Admin ID not found');
        const token = await this.authService.registerEmployee(data, adminId);
        res.status(201).json({ token });
    };

    getUser = async (req: Request, res: Response, next: NextFunction) => {
        const userId = parseInt(req.params.id, 10);
        const user = await this.authService.getUser(userId);
        res.json(user);
    };

    updateUser = async (req: Request, res: Response, next: NextFunction) => {
        const userId = parseInt(req.params.id, 10);
        const data = req.body as Partial<UserRegisterRequestBody>;
        const updatedUser = await this.authService.updateUser(userId, data);
        res.json(updatedUser);
    };

    deleteUser = async (req: Request, res: Response, next: NextFunction) => {
        const userId = parseInt(req.params.id, 10);
        await this.authService.deleteUser(userId);
        res.status(204).send();
    };

    getEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = parseInt(req.params.id, 10);
        const employee = await this.authService.getEmployee(employeeId);
        res.json(employee);
    };

    updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = parseInt(req.params.id, 10);
        const data = req.body as Partial<EmployeeRegisterRequestBody>;
        const adminId = req.user?.employeeId!;
        const updatedEmployee = await this.authService.updateEmployee(employeeId, data, adminId);
        res.json(updatedEmployee);
    };

    deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = parseInt(req.params.id, 10);
        const adminId = req.user?.employeeId!;
        await this.authService.deleteEmployee(employeeId, adminId);
        res.status(204).send();
    };
}

export default AuthController;