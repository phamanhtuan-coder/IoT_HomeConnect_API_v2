// src/controllers/planning.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PlanningService } from '../services/planning.service';
import { BatchService } from '../services/production-batches.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { PlanningCreateInput, PlanningApprovalInput, PlanningResponse, BatchResponse } from '../types/planning';

export class PlanningController {
    private planningService: PlanningService;
    private batchService: BatchService;

    constructor() {
        this.planningService = new PlanningService();
        this.batchService = new BatchService();
    }

    getListBatchesCompleted = async (req: Request, res: Response, next: NextFunction) => {

        const planningId = req.params.planningId;
        console.log('planningId', planningId);
        const result = await this.batchService.getListBatchesCompleted(planningId);

        res.status(200).json(result);
    }

    getPlanningsByBatchProductionStatusIsCompleted = async (req: Request, res: Response, next: NextFunction) => {
        console.log('getPlanningsByBatchProductionStatusIsCompleted');
        const result = await this.planningService.getPlanningsByBatchProductionStatusIsCompleted();

        res.status(200).json(result);
    }

    createPlanningApi = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const employeeId = req.user?.employeeId;
            // const employeeId = 'admin123';
            if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');
           

            const data = req.body as PlanningCreateInput;
            const planning = await this.planningService.createPlanning(data, employeeId);

            const response: PlanningResponse = {
                success: true,
                data: planning,
                message: 'Planning created successfully'
            };

            res.status(201).json(response);
        } catch (error) {
            next(error);
        }
    };

    getPlanningByIdApi = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const employeeId = req.user?.employeeId;
            // const employeeId = 'idemploytest';
            if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

            const planningId = req.params.planningId;
            const planning = await this.planningService.getPlanningById(planningId);

            const response: PlanningResponse = {
                success: true,
                data: planning
            };

            res.json(response);
        } catch (error) {
            next(error);
        }
    };

    getAllPlanningsApi = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const employeeId = req.user?.employeeId;
            // const employeeId = 'idemploytest';
            if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

            const plannings = await this.planningService.getAllPlannings();

            const response: PlanningResponse = {
                success: true,
                data: plannings
            };

            res.json(response);
        } catch (error) {
            console.log(error);
            next(error);
        }
    };

    approvePlanningApi = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const employeeId = req.user?.employeeId;
            // const employeeId = 'idemploytest';
            if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

            const planningId = req.params.planningId;
            const data = req.body as PlanningApprovalInput;
            const planning = await this.planningService.approvePlanning(planningId, data, employeeId);

            const response: PlanningResponse = {
                success: true,
                data: planning,
                message: `Planning ${data.status === 'approved' ? 'in_progress' : 'rejected'} successfully`
            };

            res.json(response);
        } catch (error) {
            next(error);
        }
    };

    createBatchApi = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const employeeId = req.user?.employeeId;
            // const employeeId = 'idemploytest';
            if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

            const planningId = req.params.planningId;
            const data = req.body;
            const batch = await this.batchService.createBatch(planningId, data, employeeId);

            const response: BatchResponse = {
                success: true,
                data: batch,
                message: 'Batch created successfully'
            };

            res.status(201).json(response);
        } catch (error) {
            next(error);
        }
    };

    updateBatchStatusApi = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const employeeId = req.user?.employeeId;
            // const employeeId = 'idemploytest';
            if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

            const batchId = req.params.batchId;
            const data = req.body;
            const batch = await this.batchService.updateBatchStatus(batchId, data, employeeId);

            const response: BatchResponse = {
                success: true,
                data: batch,
                message: 'Batch status updated successfully'
            };

            res.json(response);
        } catch (error) {
            console.log(error);
            next(error);
        }
    };

    getBatchesByPlanningIdApi = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const employeeId = req.user?.employeeId;
            // const employeeId = 'idemploytest';
            if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

            const planningId = req.params.planningId;
            const batches = await this.batchService.getBatchesByPlanningId(planningId);

            const response: BatchResponse = {
                success: true,
                data: batches
            };

            res.json(response);
        } catch (error) {
            next(error);
        }
    };

    // src/controllers/planning.controller.ts
createPlanningWithBatchesApi = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const employeeId = req.user?.employeeId;
            // const employeeId = 'admin123';
            if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');
           
        const { planning, batches } = req.body;
        
        // Gọi service để tạo planning và batches trong transaction
        const result = await this.planningService.createPlanningWithBatches(planning, batches, employeeId);

        const response: PlanningResponse = {
            success: true,
            data: result,
            message: 'Planning and batches created successfully'
        };

        res.status(201).json(response);
    } catch (error) {
        next(error);
    }
};


}