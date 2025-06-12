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

    /**
     * Đăng nhập tài khoản người dùng
     * @param req Request Express với thông tin đăng nhập trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    loginUser = async (req: Request, res: Response, next: NextFunction) => {
        const { username, password, rememberMe, deviceName, deviceId, deviceUuid } = req.body; // Thay email thành username, bỏ fcmToken
        const ipAddress = req.ip;
        try {
           return await this.authService.loginUser({ username, password, rememberMe, deviceName, deviceId, deviceUuid, ipAddress });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Đăng xuất khỏi một thiết bị
     * @param req Request Express với ID thiết bị trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    logoutUser = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user?.userId;
        const userDeviceId =req.body.userDeviceId;
        const ipAddress = req.ip;

        if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
        if (!userDeviceId || isNaN(userDeviceId)) {
            throwError(ErrorCodes.BAD_REQUEST, 'Valid UserDeviceID is required');
        }

        await this.userDeviceService.logoutDevice(userDeviceId, userId, ipAddress);
        res.status(204).send();
    };

    /**
     * Đăng xuất khỏi nhiều thiết bị
     * @param req Request Express với danh sách ID thiết bị trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    logoutMultipleDevices = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user?.userId;
        const { userDeviceIds } = req.body as LogoutMultipleDevicesRequest; // Type the body
        const ipAddress = req.ip;

        if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
        if (!Array.isArray(userDeviceIds) || userDeviceIds.length === 0 || userDeviceIds.some(id => isNaN(parseInt(id.toString())))) {
            throwError(ErrorCodes.BAD_REQUEST, 'Valid array of UserDeviceIDs is required');
        }

        await this.userDeviceService.logoutDevices(userDeviceIds.map(id => id.toString()), userId, ipAddress);
        res.status(204).send();
    };

    /**
     * Đăng xuất khỏi tất cả thiết bị
     * @param req Request Express
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    logoutAllDevices = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user?.userId;
        const ipAddress = req.ip;

        if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        await this.userDeviceService.logoutAllDevices(userId, ipAddress);
        res.status(204).send();
    };

    /**
     * Đăng nhập tài khoản nhân viên
     * @param req Request Express với thông tin đăng nhập trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    loginEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const { username, password } = req.body;
        try {
            const result = await this.authService.loginEmployee({ username, password });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Làm mới token truy cập cho nhân viên
     * @param req Request Express với token làm mới trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    refreshEmployeeToken = async (req: Request, res: Response, next: NextFunction) => {
        const { refreshToken } = req.body;
        const accessToken = await this.authService.refreshEmployeeToken(refreshToken);
        res.json({ accessToken });
    };

    /**
     * Làm mới token truy cập
     * @param req Request Express với token làm mới trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    refreshToken = async (req: Request, res: Response, next: NextFunction) => {
        const { refreshToken } = req.body as { refreshToken: string };
        if (!refreshToken) throwError(ErrorCodes.BAD_REQUEST, 'Refresh token required');

        const accessToken = await this.authService.refreshToken(refreshToken);
        res.json({ accessToken });
    };

    /**
     * Đăng ký tài khoản người dùng mới
     * @param req Request Express với thông tin đăng ký trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    registerUser = async (req: Request, res: Response, next: NextFunction) => {
        const data = req.body as UserRegisterRequestBody;
        const token = await this.authService.registerUser(data);
        res.status(201).json({ token });
    };

    /**
     * Đăng ký tài khoản nhân viên mới
     * @param req Request Express với thông tin đăng ký trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    registerEmployee = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const adminId = req.user?.userId || req.user?.employeeId;
            if (!adminId) throwError(ErrorCodes.UNAUTHORIZED, 'Admin not authenticated');

            const data = req.body as EmployeeRegisterRequestBody;
            const token = await this.authService.registerEmployee(data, adminId);
            res.status(201).json({ token });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Đăng xuất tài khoản nhân viên
     * @param req Request Express
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    logoutEmployee = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        await this.authService.logoutEmployee(employeeId);
        res.status(204).send();
    };

    /**
     * Cập nhật token thiết bị
     * @param req Request Express với token thiết bị trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateDeviceToken = async (req: Request, res: Response, next: NextFunction) => {
        const { deviceToken } = req.body;
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
        if (!deviceToken) throwError(ErrorCodes.BAD_REQUEST, 'Device token is required');

        try {
            const result = await this.authService.updateDeviceToken(accountId, deviceToken);
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Kiểm tra trạng thái xác thực email
     * @param req Request Express với email trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    checkEmailVerification = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email } = req.body;
            const result = await this.authService.checkEmailVerification(email);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xác thực email người dùng
     * @param req Request Express với email trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email } = req.body;
            const result = await this.authService.verifyEmail(email);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật thông tin người dùng
     * @param req Request Express với thông tin cập nhật trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

            const result = await this.authService.updateUser(userId, req.body);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Khôi phục mật khẩu
     * @param req Request Express với email và mật khẩu mới trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    recoveryPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, newPassword } = req.body;
            const result = await this.authService.recoveryPassword(email, newPassword);
            res.json(result);
        } catch (error) {
            next(error);
        }
    };
}

export default AuthController;
