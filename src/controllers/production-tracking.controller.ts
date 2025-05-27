import { Request, Response, NextFunction } from 'express';
import { ProductionTrackingService } from '../services/production-tracking.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { ProductionTrackingNextStageInput, ProductionTrackingRejectForQCInput, ProductionTrackingResponsePhaseChangeInput } from '../types/production-tracking';

export class ProductionTrackingController {
    private productionTrackingService: ProductionTrackingService;

    constructor() {
        this.productionTrackingService = new ProductionTrackingService();
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
    }

    async RejectProductionSerial(req: Request, res: Response, next: NextFunction) {
        const result = await this.productionTrackingService.RejectProductionSerial(req.body as ProductionTrackingRejectForQCInput);
        
    }
}

