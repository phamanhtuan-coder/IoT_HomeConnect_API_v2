import { Router } from 'express';
import OwnershipHistoryController from '../controllers/ownershipHistory.controller';
import authMiddleware  from '../middleware/auth.middleware';
import  validate  from '../middleware/validate.middleware';
import {
    ownershipTransferSchema,
    approveOwnershipTransferSchema,
    ownershipHistoryIdSchema,
    deviceSerialSchema,
} from '../utils/validators';
import {restrictToDeviceOwner} from "../middleware/role.middleware";

const router = Router();
const ownershipHistoryController = new OwnershipHistoryController();

router.post(
    '/transfer',
    authMiddleware,
    restrictToDeviceOwner,
    validate(ownershipTransferSchema),
    ownershipHistoryController.initiateOwnershipTransfer.bind(ownershipHistoryController)
);

router.post(
    '/transfer/:ticketId/approve',
    authMiddleware,
    validate(approveOwnershipTransferSchema),
    ownershipHistoryController.approveOwnershipTransfer.bind(ownershipHistoryController)
);

router.get(
    '/:historyId',
    authMiddleware,
    validate(ownershipHistoryIdSchema),
    ownershipHistoryController.getOwnershipHistoryById.bind(ownershipHistoryController)
);

router.get(
    '/device/:device_serial',
    authMiddleware,
    validate(deviceSerialSchema),
    ownershipHistoryController.getOwnershipHistoryByDevice.bind(ownershipHistoryController)
);

router.get(
    '/user',
    authMiddleware,
    ownershipHistoryController.getOwnershipHistoryByUser.bind(ownershipHistoryController)
);

router.delete(
    '/:historyId',
    authMiddleware,
    validate(ownershipHistoryIdSchema),
    ownershipHistoryController.deleteOwnershipHistory.bind(ownershipHistoryController)
);

export default router;