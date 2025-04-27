import { Router, Request, Response, NextFunction } from 'express';
import DeviceController from '../controllers/device.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import { deviceSchema, deviceIdSchema, linkDeviceSchema, toggleDeviceSchema, updateAttributesSchema, updateWifiSchema } from '../utils/validators';

const router = Router();
const deviceController = new DeviceController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.post(
    '/',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(deviceSchema),
    asyncHandler(deviceController.createDevice)
);

router.post(
    '/link',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(linkDeviceSchema),
    asyncHandler(deviceController.linkDevice)
);

router.put(
    '/:deviceId/toggle',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(toggleDeviceSchema),
    asyncHandler(deviceController.toggleDevice)
);

router.put(
    '/:deviceId/attributes',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(updateAttributesSchema),
    asyncHandler(deviceController.updateDeviceAttributes)
);

router.get(
    '/account',
    authMiddleware,
    asyncHandler(deviceController.getDevicesByAccount)
);

router.get(
    '/group/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(deviceController.getDevicesByGroup)
);

router.get(
    '/house/:houseId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(deviceController.getDevicesByHouse)
);

router.get(
    '/space/:spaceId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(deviceController.getDevicesBySpace)
);

router.get(
    '/:deviceId',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    asyncHandler(deviceController.getDeviceById)
);

router.delete(
    '/:deviceId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(deviceIdSchema),
    asyncHandler(deviceController.unlinkDevice)
);

router.put(
    '/:deviceId/space',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(deviceIdSchema),
    asyncHandler(deviceController.updateDeviceSpace)
);

router.put(
    '/:deviceId/wifi',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(updateWifiSchema),
    asyncHandler(deviceController.updateDeviceWifi)
);

export default router;