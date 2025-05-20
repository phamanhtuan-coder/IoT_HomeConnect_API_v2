import { Router } from 'express';
import FirmwareUpdateHistoryController from '../controllers/firmware-update-history.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import { firmwareUpdateHistorySchema, updateFirmwareUpdateHistorySchema, firmwareUpdateHistoryIdSchema, firmwareUpdateHistoryFilterSchema } from '../utils/validators';

const router = Router();
const firmwareUpdateHistoryController = new FirmwareUpdateHistoryController();

router.post(
    '/',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(firmwareUpdateHistorySchema),
    firmwareUpdateHistoryController.createFirmwareUpdateHistory
);

router.put(
    '/:updateId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(updateFirmwareUpdateHistorySchema),
    firmwareUpdateHistoryController.updateFirmwareUpdateHistory
);

router.delete(
    '/:updateId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(firmwareUpdateHistoryIdSchema),
    firmwareUpdateHistoryController.deleteFirmwareUpdateHistory
);

router.get(
    '/:updateId',
    authMiddleware,
    validateMiddleware(firmwareUpdateHistoryIdSchema),
    firmwareUpdateHistoryController.getFirmwareUpdateHistoryById
);

router.get(
    '/',
    authMiddleware,
    validateMiddleware(firmwareUpdateHistoryFilterSchema),
    firmwareUpdateHistoryController.getFirmwareUpdateHistories
);

export default router;
