import { Request, Response, NextFunction } from 'express';
import { ProductionTrackingService } from '../services/production-tracking.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { ProductionTrackingInput } from '../types/production-tracking';

export class ProductionTrackingController {
    private productionTrackingService: ProductionTrackingService;

    constructor() {
        this.productionTrackingService = new ProductionTrackingService();
    }

    createProductionTracking = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const data = req.body as ProductionTrackingInput;
            const productionTracking = await this.productionTrackingService.createProductionTracking({
                ...data,
                employee_id: employeeId
            });
            res.status(201).json(productionTracking);
        } catch (error) {
            next(error);
        }
    };

    getProductionTrackingById = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const productionId = parseInt(req.params.productionId);
            const productionTracking = await this.productionTrackingService.getProductionTrackingById(productionId);
            res.json(productionTracking);
        } catch (error) {
            next(error);
        }
    };

    getProductionTrackingByBatchId = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            // Changed from parseInt to get the string value directly since production_batch_id is a string
            const batchId = req.params.batchId;
            const productionTrackings = await this.productionTrackingService.getProductionTrackingByBatchId(batchId);
            res.json(productionTrackings);
        } catch (error) {
            next(error);
        }
    };

    updateProductionTracking = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const productionId = parseInt(req.params.productionId);
            const data = req.body;
            const productionTracking = await this.productionTrackingService.updateProductionTracking(
                productionId,
                {
                    ...data,
                    employee_id: employeeId
                }
            );
            res.json(productionTracking);
        } catch (error) {
            next(error);
        }
    };

    deleteProductionTracking = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const productionId = parseInt(req.params.productionId);
            await this.productionTrackingService.deleteProductionTracking(productionId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

