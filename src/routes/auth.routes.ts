import { Router, Request, Response, NextFunction } from 'express';
import AuthController from '../controllers/auth.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import { loginSchema, userRegisterSchema, employeeRegisterSchema, refreshTokenSchema } from '../utils/validators';

const router = Router();
const authController = new AuthController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.post('/login', validateMiddleware(loginSchema), asyncHandler(authController.loginUser));
router.post('/employee/login', validateMiddleware(loginSchema), asyncHandler(authController.loginEmployee));
router.post('/register', validateMiddleware(userRegisterSchema), asyncHandler(authController.registerUser));
router.post(
    '/employee/register',
    authMiddleware,
    validateMiddleware(employeeRegisterSchema),
    asyncHandler(authController.registerEmployee)
);
router.post('/refresh', validateMiddleware(refreshTokenSchema), asyncHandler(authController.refreshToken));
router.post('/employee/refresh', validateMiddleware(refreshTokenSchema), asyncHandler(authController.refreshEmployeeToken));
router.post('/logout', authMiddleware, authController.logoutUser); // Single device.ts
router.post('/employee/logout', authMiddleware, authController.logoutEmployee);
router.post('/logout/multiple', authMiddleware, authController.logoutMultipleDevices); // Multiple devices
router.post('/logout/all', authMiddleware, authController.logoutAllDevices); // All devices
router.post('/update-device-token', authMiddleware, authController.updateDeviceToken); // Update device.ts token
export default router;