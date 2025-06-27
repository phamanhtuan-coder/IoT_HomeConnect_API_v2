// src/routes/door.routes.ts
import { NextFunction, Request, Response, Router } from 'express';
import { DoorController } from '../controllers/door.controller';
import authMiddleware from '../middleware/auth.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import {
    DoorSerialSchema,
    DoorToggleSchema,
    DoorConfigUpdateSchema,
    DoorEmergencySchema,
    DoorBulkOperationSchema,
    DoorCalibrateSchema,
    DoorTestSchema,
    DoorQueryFiltersSchema,
    DoorMaintenanceSchema
} from '../utils/schemas/door.schemas';

const router = Router();
const doorController = new DoorController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
};

router.post(
    '/:serialNumber/toggle',
    authMiddleware,
    validateMiddleware(DoorSerialSchema),
    validateMiddleware(DoorToggleSchema),
    asyncHandler(doorController.toggleDoor)
);

router.get(
    '/:serialNumber/status',
    authMiddleware,
    validateMiddleware(DoorSerialSchema),
    asyncHandler(doorController.getDoorStatus)
);

router.put(
    '/:serialNumber/config',
    authMiddleware,
    validateMiddleware(DoorSerialSchema),
    validateMiddleware(DoorConfigUpdateSchema),
    asyncHandler(doorController.updateDoorConfig)
);

router.post(
    '/emergency',
    authMiddleware,
    validateMiddleware(DoorEmergencySchema),
    asyncHandler(doorController.emergencyDoorOperation)
);

router.post(
    '/bulk',
    authMiddleware,
    validateMiddleware(DoorBulkOperationSchema),
    asyncHandler(doorController.bulkDoorOperation)
);

router.get(
    '/',
    authMiddleware,
    validateMiddleware(DoorQueryFiltersSchema),
    asyncHandler(doorController.getUserDoors)
);

router.post(
    '/:serialNumber/calibrate',
    authMiddleware,
    validateMiddleware(DoorSerialSchema),
    validateMiddleware(DoorCalibrateSchema),
    asyncHandler(doorController.calibrateDoor)
);

router.post(
    '/:serialNumber/test',
    authMiddleware,
    validateMiddleware(DoorSerialSchema),
    validateMiddleware(DoorTestSchema),
    asyncHandler(doorController.testDoor)
);

router.post(
    '/:serialNumber/maintenance',
    authMiddleware,
    validateMiddleware(DoorSerialSchema),
    validateMiddleware(DoorMaintenanceSchema),
    asyncHandler(doorController.performMaintenance)
);

export default router;