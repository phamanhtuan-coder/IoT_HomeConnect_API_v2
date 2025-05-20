import express, { Request, Response, NextFunction } from 'express';
import { UserDeviceController } from '../controllers/user-device.controller';
import authMiddleware from '../middleware/auth.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import { userDeviceIdSchema, deviceIdForRevokeSchema } from '../utils/validators';

const router = express.Router();
const userDeviceController = new UserDeviceController();

/**
 * Hàm helper để xử lý bất đồng bộ và bắt lỗi cho các controller.
 * @param fn Hàm controller bất đồng bộ
 * @returns Middleware Express xử lý lỗi
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

// Routes
router.get(
    '/me', 
    authMiddleware, 
    asyncHandler(userDeviceController.getOwnDevices)
); // User's own devices

router.get(
    '/:userId',
    authMiddleware,
    validateMiddleware(userDeviceIdSchema),
    asyncHandler(userDeviceController.getUserDevices)
); // Admin: any user's devices

router.delete(
    '/:deviceId',
    authMiddleware,
    validateMiddleware(deviceIdForRevokeSchema),
    asyncHandler(userDeviceController.revokeDevice)
); // Revoke device

export default router;
