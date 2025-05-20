import { Router } from 'express';
import FirmwareController from '../controllers/firmware.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import { firmwareSchema, updateFirmwareSchema, firmwareIdSchema } from '../utils/validators';

const router = Router();
const firmwareController = new FirmwareController();

router.post(
    '/',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(firmwareSchema),
    firmwareController.createFirmware
);

router.put(
    '/:firmwareId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(updateFirmwareSchema),
    firmwareController.updateFirmware
);

router.delete(
    '/:firmwareId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(firmwareIdSchema),
    firmwareController.deleteFirmware
);

router.get(
    '/:firmwareId',
    authMiddleware,
    validateMiddleware(firmwareIdSchema),
    firmwareController.getFirmwareById
);

router.get(
    '/',
    authMiddleware,
    firmwareController.getFirmwares
);

export default router;