import { Request, Response, NextFunction } from 'express';
import { BatchService } from '../services/production-batches.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { ProductionBatchCreateInput, ProductionBatchUpdateInput } from '../types/production-batches';

export class ProductionBatchesController {
    private batchService: BatchService;

    constructor() {
        this.batchService = new BatchService();
    }

    // createProductionBatch = async (req: Request, res: Response, next: NextFunction) => {
    //     const employeeId = req.user?.employeeId;
    //     if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

    //     try {
    //         const data = req.body as ProductionBatchCreateInput;
    //         const productionBatch = await this.batchService.createBatch(data, employeeId);
    //         res.status(201).json(productionBatch);
    //     } catch (error) {
    //         next(error);
    //     }
    // };

    // getProductionBatchById = async (req: Request, res: Response, next: NextFunction) => {
    //     const employeeId = req.user?.employeeId;
    //     if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

    //     try {
    //         const batchId = parseInt(req.params.batchId);
    //         const productionBatch = await this.productionBatchesService.getProductionBatchById(batchId);
    //         res.json(productionBatch);
    //     } catch (error) {
    //         next(error);
    //     }
    // };

    // getAllProductionBatches = async (req: Request, res: Response, next: NextFunction) => {
    //     const employeeId = req.user?.employeeId;
    //     if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

    //     try {
    //         const productionBatches = await this.productionBatchesService.getAllProductionBatches();
    //         res.json(productionBatches);
    //     } catch (error) {
    //         next(error);
    //     }
    // };

    // updateProductionBatch = async (req: Request, res: Response, next: NextFunction) => {
    //     const employeeId = req.user?.employeeId;
    //     if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

    //     try {
    //         const batchId = parseInt(req.params.batchId);
    //         const data = req.body as ProductionBatchUpdateInput;
    //         const productionBatch = await this.productionBatchesService.updateProductionBatch(batchId, data, employeeId);
    //         res.json(productionBatch);
    //     } catch (error) {
    //         next(error);
    //     }
    // };

    // deleteProductionBatch = async (req: Request, res: Response, next: NextFunction) => {
    //     const employeeId = req.user?.employeeId;
    //     if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

    //     try {
    //         const batchId = parseInt(req.params.batchId);
    //         await this.productionBatchesService.deleteProductionBatch(batchId);
    //         res.status(204).send();
    //     } catch (error) {
    //         next(error);
    //     }
    // };

    getListBatch = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const listBatch = await this.batchService.getListBatch();

            res.status(200).json(listBatch);
        } catch (error) {
            next(error);
        }
    }
}