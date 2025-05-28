import { Router } from 'express';
import { ProductionTrackingController } from '../controllers/production-tracking.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import { productionTrackingSchema, productionTrackingIdSchema } from '../utils/schemas/production-tracking.schema';

const router = Router();
const productionTrackingController = new ProductionTrackingController();

router.get(
    '/production-batch/:production_batch_id',
    authMiddleware, roleMiddleware,
    productionTrackingController.getProductionTrackingByProductionBatchId
);


router.patch(
    '/request-phase-change',
    authMiddleware, roleMiddleware,
    productionTrackingController.RequestPhaseChange
);

router.patch(
    '/response-phase-change',
    authMiddleware, roleMiddleware,
    productionTrackingController.ResponsePhaseChange
);

router.patch(
    '/reject-production-serial',
    authMiddleware, roleMiddleware,
    productionTrackingController.RejectProductionSerial
);

router.delete(
    '/cancel-production-serial',
    authMiddleware, roleMiddleware,
    productionTrackingController.ResponseCancelProductionSerial
);


export default router;
