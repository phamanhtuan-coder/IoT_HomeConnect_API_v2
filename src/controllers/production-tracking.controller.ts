import { Request, Response, NextFunction } from 'express';
import { ProductionTrackingService } from '../services/production-tracking.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { ProductionTrackingCancelInput, ProductionTrackingNextStageInput, ProductionTrackingRejectForQCInput, ProductionTrackingResponsePhaseChangeInput } from '../types/production-tracking';

export class ProductionTrackingController {
    private productionTrackingService: ProductionTrackingService;

    constructor() {
        this.productionTrackingService = new ProductionTrackingService();
    }

    async getProductionTrackingByProductionBatchId(req: Request, res: Response, next: NextFunction) {
        const result = await this.productionTrackingService.getProductionTrackingByProductionBatchId(req.params.production_batch_id);

        res.status(200).json(result);
    }

    async RequestPhaseChange(req: Request, res: Response, next: NextFunction) {
        const result = await this.productionTrackingService.RequestPhaseChange(req.body as ProductionTrackingNextStageInput);

        if (result.success) {
            res.status(200).json(result);
        } else {
            if (result.errorCode === ErrorCodes.UNAUTHORIZED) {
                res.status(403).json(result);
            } else {
                res.status(400).json(result);
            }
        }
    }

    async ResponsePhaseChange(req: Request, res: Response, next: NextFunction) {
        const result = await this.productionTrackingService.ResponsePhaseChange(req.body as ProductionTrackingResponsePhaseChangeInput);

        res.status(200).json(result);
    }

    async RejectProductionSerial(req: Request, res: Response, next: NextFunction) {
        const result = await this.productionTrackingService.RejectProductionSerial(req.body as ProductionTrackingRejectForQCInput);

        res.status(200).json(result);
    }

    async ResponseCancelProductionSerial(req: Request, res: Response, next: NextFunction) {
        const result = await this.productionTrackingService.ResponseCancelProductionSerial(req.body as ProductionTrackingCancelInput);
        
        res.status(200).json(result);
    }
}

