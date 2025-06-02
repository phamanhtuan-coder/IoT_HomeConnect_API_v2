// src/routes/planning.routes.ts
import { NextFunction, Router, Request, Response } from 'express';
import { ProductionBatchesController } from '../controllers/production-batches.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import {
} from '../utils/schemas/production-batches.schema';

const router = Router();
const productionBatchesController = new ProductionBatchesController();

/**
 * Hàm wrapper để xử lý bất đồng bộ và bắt lỗi cho các controller.
 * @param fn Hàm controller bất đồng bộ
 * @returns Middleware Express xử lý lỗi
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.get('/',
    // authMiddleware,
    // roleMiddleware,
    asyncHandler(productionBatchesController.getListBatch)
);

export default router;