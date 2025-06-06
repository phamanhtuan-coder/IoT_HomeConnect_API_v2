import { NextFunction, Router } from 'express';
import { ProductionTrackingController } from '../controllers/production-tracking.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import { ApproveProductionSchema, UpdateProductionSchema, RejectProductionSchema, CancelProductionSchema, ApproveTestedSchema, GetSerialFirmwareSchema } from '../utils/schemas/production-tracking.schema';

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

// Xác nhận sản phẩm đã được kiểm tra
router.post(
    '/approve-production-serial',
    // authMiddleware,
    // roleMiddleware,
    validateMiddleware(ApproveProductionSchema),
    productionTrackingController.ApproveProductionSerial
);

router.patch(
    '/cancel-production-serial',
    // authMiddleware,
    // roleMiddleware,
    validateMiddleware(CancelProductionSchema),
    productionTrackingController.CancelProductionSerial
);

router.patch(
    '/update-serial',
    // authMiddleware,
    // roleMiddleware,
    validateMiddleware(UpdateProductionSchema),
    productionTrackingController.UpdateProductionSerial
);

router.patch(
    '/reject-qc',
    // authMiddleware,
    // roleMiddleware,
    validateMiddleware(RejectProductionSchema),
    productionTrackingController.RejectProductionSerial
);

router.patch(
    '/approve-tested-serial',
    // authMiddleware,
    // roleMiddleware,
    validateMiddleware(ApproveTestedSchema),
    productionTrackingController.ApproveTestedSerial
);

router.get(
    '/info-need-upload-firmware/:type/:planning_id?/:batch_id?',
    // authMiddleware,
    // roleMiddleware,
    // validateMiddleware(GetSerialFirmwareSchema),
    productionTrackingController.getSerialWithNeedFirmwareInProgress
);

export default router;
