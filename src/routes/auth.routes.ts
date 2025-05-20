/**
     * Định nghĩa các route xác thực cho ứng dụng.
     * Sử dụng các middleware để xác thực, kiểm tra dữ liệu đầu vào và xử lý bất đồng bộ.
     * Bao gồm các chức năng: đăng nhập, đăng ký, làm mới token, đăng xuất, cập nhật device token.
     */

    import { Router, Request, Response, NextFunction } from 'express';
    import AuthController from '../controllers/auth.controller';
    import validateMiddleware from '../middleware/validate.middleware';
    import authMiddleware from '../middleware/auth.middleware';
    import { loginSchema, userRegisterSchema, employeeRegisterSchema, refreshTokenSchema } from '../utils/validators';

    const router = Router();
    const authController = new AuthController();

    /**
     * Hàm helper để xử lý các controller bất đồng bộ và bắt lỗi.
     * @param fn Hàm controller bất đồng bộ
     * @returns Middleware Express xử lý lỗi bất đồng bộ
     */
    const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
        return (req: Request, res: Response, next: NextFunction) => {
            fn(req, res, next).catch(next);
        };
    };

    /**
     * Đăng nhập người dùng.
     */
    router.post('/login', validateMiddleware(loginSchema), asyncHandler(authController.loginUser));

    /**
     * Đăng nhập nhân viên.
     */
    router.post('/employee/login', validateMiddleware(loginSchema), asyncHandler(authController.loginEmployee));

    /**
     * Đăng ký người dùng.
     */
    router.post('/register', validateMiddleware(userRegisterSchema), asyncHandler(authController.registerUser));

    /**
     * Đăng ký nhân viên (yêu cầu xác thực).
     */
    router.post(
        '/employee/register',
        authMiddleware,
        validateMiddleware(employeeRegisterSchema),
        asyncHandler(authController.registerEmployee)
    );

    /**
     * Làm mới token cho người dùng.
     */
    router.post('/refresh', validateMiddleware(refreshTokenSchema), asyncHandler(authController.refreshToken));

    /**
     * Làm mới token cho nhân viên.
     */
    router.post('/employee/refresh', validateMiddleware(refreshTokenSchema), asyncHandler(authController.refreshEmployeeToken));

    /**
     * Đăng xuất người dùng (1 thiết bị).
     */
    router.post('/logout', authMiddleware, authController.logoutUser); // Single device.ts

    /**
     * Đăng xuất nhân viên (1 thiết bị).
     */
    router.post('/employee/logout', authMiddleware, authController.logoutEmployee);

    /**
     * Đăng xuất nhiều thiết bị.
     */
    router.post('/logout/multiple', authMiddleware, authController.logoutMultipleDevices); // Multiple devices

    /**
     * Đăng xuất tất cả thiết bị.
     */
    router.post('/logout/all', authMiddleware, authController.logoutAllDevices); // All devices

    /**
     * Cập nhật device token cho người dùng/nhân viên.
     */
    router.post('/update-device-token', authMiddleware, authController.updateDeviceToken); // Update device.ts token

    export default router;