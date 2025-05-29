import { Request, Response, NextFunction } from 'express';
import { ProductionTrackingService } from '../services/production-tracking.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { ProductionTrackingCancelInput, ProductionTrackingNextStageInput, ProductionTrackingRejectForQCInput, ProductionTrackingResponsePhaseChangeInput, ProductionTrackingSerialUpdateInput } from '../types/production-tracking';

export class ProductionTrackingController {
    private productionTrackingService: ProductionTrackingService;

    constructor() {
        this.productionTrackingService = new ProductionTrackingService();
    }

    getProductionTrackingByProductionBatchId = async(req: Request, res: Response, next: NextFunction) => {
        const result = await this.productionTrackingService.getProductionTrackingByProductionBatchId(req.params.production_batch_id);

        res.status(200).json(result);
    }

    ResponsePhaseChange = async(req: Request, res: Response, next: NextFunction) => {
        const result = await this.productionTrackingService.ResponsePhaseChange(req.body as ProductionTrackingResponsePhaseChangeInput);

        res.status(200).json(result);
    }

    RejectProductionSerial = async(req: Request, res: Response, next: NextFunction) => {
        const result = await this.productionTrackingService.RejectProductionSerial(req.body as ProductionTrackingRejectForQCInput);

        res.status(200).json(result);
    }

    ResponseCancelProductionSerial = async(req: Request, res: Response, next: NextFunction) => {
        const result = await this.productionTrackingService.ResponseCancelProductionSerial(req.body as ProductionTrackingCancelInput);

        res.status(200).json(result);
    }

    UpdateProductionSerial = async (req: Request, res: Response, next: NextFunction) => {
        console.log("-----------");
        const result = await this.productionTrackingService.UpdateProductionSerial(req.body as ProductionTrackingSerialUpdateInput, req.body.employee_id);

        res.status(200).json(result);
    }   
}