import { NextFunction, Router } from 'express';
import { ProductionTrackingController } from '../controllers/production-tracking.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import { productionTrackingSchema, productionTrackingIdSchema } from '../utils/schemas/production-tracking.schema';

const router = Router();
const productionTrackingController = new ProductionTrackingController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.get(
    '/production-batch/:production_batch_id',
    // authMiddleware,
    // roleMiddleware,
    productionTrackingController.getProductionTrackingByProductionBatchId
);

router.post(
    '/approve-production-serial',
    // authMiddleware,
    // roleMiddleware,
    productionTrackingController.ApproveProductionSerial
);

router.patch(
    '/update-serial',
    // authMiddleware,
    // roleMiddleware,
    productionTrackingController.UpdateProductionSerial
);

router.patch(
    '/reject-qc',
    // authMiddleware,
    // roleMiddleware,
    productionTrackingController.RejectProductionSerial
);

router.patch(
    '/cancel-production-serial',
    // authMiddleware,
    // roleMiddleware,
    productionTrackingController.CancelProductionSerial
);


export default router;
