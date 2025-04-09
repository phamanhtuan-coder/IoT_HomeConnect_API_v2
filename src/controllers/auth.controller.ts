// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth.service';
import { LoginRequestBody, UserRegisterRequestBody, EmployeeRegisterRequestBody } from '../types/auth';
import {ErrorCodes, throwError} from "../utils/errors";
import {UserDeviceService} from "../services/user-device.service";

// Define interface for logout multiple devices request body
interface LogoutMultipleDevicesRequest {
    userDeviceIds: number[] | string[]; // Can accept strings or numbers from client
}

class AuthController {
    private authService: AuthService;
    private userDeviceService: UserDeviceService;

    constructor() {
        this.authService = new AuthService();
        this.userDeviceService = new UserDeviceService();
    }

    loginUser = async (req: Request, res: Response, next: NextFunction) => {
        const { email, password, rememberMe, deviceName, deviceId, deviceUuid, fcmToken } = req.body;
        const ipAddress = req.ip;
        const tokens = await this.authService.loginUser({ email, password, rememberMe, deviceName, deviceId,deviceUuid, fcmToken, ipAddress });
        res.json(tokens);
    };

    // Logout single device
    logoutUser = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user?.userId;
        const userDeviceId = parseInt(req.body.userDeviceId, 10);
        const ipAddress = req.ip;

        if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
        if (!userDeviceId || isNaN(userDeviceId)) {
            throwError(ErrorCodes.BAD_REQUEST, 'Valid UserDeviceID is required');
        }

        await this.userDeviceService.logoutDevice(userDeviceId, userId, ipAddress);
        res.status(204).send();
    };

    // Logout multiple devices
    logoutMultipleDevices = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user?.userId;
        const { userDeviceIds } = req.body as LogoutMultipleDevicesRequest; // Type the body
        const ipAddress = req.ip;

        if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
        if (!Array.isArray(userDeviceIds) || userDeviceIds.length === 0 || userDeviceIds.some(id => isNaN(parseInt(id.toString())))) {
            throwError(ErrorCodes.BAD_REQUEST, 'Valid array of UserDeviceIDs is required');
        }

        await this.userDeviceService.logoutDevices(userDeviceIds.map(id => parseInt(id.toString())), userId, ipAddress);
        res.status(204).send();
    };

    // Logout all devices
    logoutAllDevices = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user?.userId;
        const ipAddress = req.ip;

        if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        await this.userDeviceService.logoutAllDevices(userId, ipAddress);
        res.status(204).send();
    };

    loginEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const { email, password } = req.body;
        const tokens = await this.authService.loginEmployee({ email, password });
        res.json(tokens);
    };


    refreshEmployeeToken = async (req: Request, res: Response, next: NextFunction) => {
        const { refreshToken } = req.body;
        const accessToken = await this.authService.refreshEmployeeToken(refreshToken);
        res.json({ accessToken });
    };

    refreshToken = async (req: Request, res: Response, next: NextFunction) => {
        const { refreshToken } = req.body as { refreshToken: string };
        if (!refreshToken) throwError(ErrorCodes.BAD_REQUEST, 'Refresh token required');

        const accessToken = await this.authService.refreshToken(refreshToken);
        res.json({ accessToken });
    };

    registerUser = async (req: Request, res: Response, next: NextFunction) => {
        const data = req.body as UserRegisterRequestBody;
        const token = await this.authService.registerUser(data);
        res.status(201).json({ token });
    };


    logoutEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        await this.authService.logoutEmployee(employeeId);
        res.status(204).send();
    };


}

export default AuthController;