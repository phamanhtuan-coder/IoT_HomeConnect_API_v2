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
import z from 'zod';

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

// Enhanced door routes for all door types

// NEW: Configure door (servo angles, rolling rounds, PIR settings)
router.put(
    '/:serialNumber/configure',
    authMiddleware,
    validateMiddleware(DoorSerialSchema),
    validateMiddleware(z.object({
        door_type: z.enum(['SERVO', 'ROLLING', 'SLIDING']).optional(),
        // Servo config
        open_angle: z.number().min(0).max(180).optional(),
        close_angle: z.number().min(0).max(180).optional(),
        // Rolling/Sliding config
        open_rounds: z.number().min(1).max(10).optional(),
        closed_rounds: z.number().min(0).max(5).optional(),
        // Sliding specific
        pir_enabled: z.boolean().optional()
    })),
    asyncHandler(doorController.configureDoor)
);

// NEW: Toggle PIR for sliding doors
router.post(
    '/:serialNumber/pir/toggle',
    authMiddleware,
    validateMiddleware(DoorSerialSchema),
    asyncHandler(doorController.togglePIR)
);

// Enhanced calibration route
router.post(
    '/:serialNumber/calibrate',
    authMiddleware,
    validateMiddleware(DoorSerialSchema),
    validateMiddleware(z.object({
        door_type: z.enum(['SERVO', 'ROLLING', 'SLIDING']).optional(),
        // Servo calibration
        openAngle: z.number().min(0).max(180).optional(),
        closeAngle: z.number().min(0).max(180).optional(),
        // Rolling/Sliding calibration
        openRounds: z.number().min(1).max(10).optional(),
        save_to_eeprom: z.boolean().optional().default(true)
    })),
    asyncHandler(doorController.calibrateDoor)
);

// NEW: Get door capabilities based on type
router.get(
    '/:serialNumber/capabilities',
    authMiddleware,
    validateMiddleware(DoorSerialSchema),
    asyncHandler(doorController.getDoorCapabilities)
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