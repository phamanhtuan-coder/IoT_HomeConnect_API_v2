// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth.service';
import { LoginRequestBody, UserRegisterRequestBody, EmployeeRegisterRequestBody } from '../types/auth';
import {ErrorCodes, throwError} from "../utils/errors";

class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    loginUser = async (req: Request, res: Response, next: NextFunction) => {
        const { email, password, rememberMe, deviceName, deviceId, deviceToken } = req.body as LoginRequestBody & { deviceName?: string; deviceId?: string; deviceToken?: string };
        const ipAddress = req.ip;
        const tokens = await this.authService.loginUser({ email, password, rememberMe, deviceName, deviceId, deviceToken, ipAddress });
        res.json(tokens);
    };

    loginEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const { email, password } = req.body as LoginRequestBody;
        const tokens = await this.authService.loginEmployee({ email, password });
        res.json(tokens);
    };

    refreshEmployeeToken = async (req: Request, res: Response, next: NextFunction) => {
        const { refreshToken } = req.body;
        const accessToken = await this.authService.refreshEmployeeToken(refreshToken);
        res.json({ accessToken });
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



    logoutUser = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user?.userId;
        const userDeviceId = parseInt(req.body.userDeviceId, 10);
        const ipAddress = req.ip;

        if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
        if (!userDeviceId || isNaN(userDeviceId)) {
            throwError(ErrorCodes.BAD_REQUEST, 'Valid UserDeviceID is required');
        }

        await this.authService.logoutDevice(userDeviceId, userId, ipAddress);
        res.status(204).send(); // No content on success
    };
}

export default AuthController;