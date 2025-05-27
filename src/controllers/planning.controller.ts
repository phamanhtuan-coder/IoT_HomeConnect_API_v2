import { Request, Response, NextFunction } from 'express';
import { PlanningService } from '../services/planning.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { PlanningCreateInput, PlanningUpdateInput } from '../types/planning';

export class PlanningController {
    private planningService: PlanningService;

    constructor() {
        this.planningService = new PlanningService();
    }

    createPlanning = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const data = req.body as PlanningCreateInput;
            const planning = await this.planningService.createPlanning(data, employeeId);
            res.status(201).json(planning);
        } catch (error) {
            next(error);
        }
    };

    getPlanningById = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const planningId = req.params.planningId;
            const planning = await this.planningService.getPlanningById(planningId);
            res.json(planning);
        } catch (error) {
            next(error);
        }
    };

    getAllPlannings = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const plannings = await this.planningService.getAllPlannings();
            res.json(plannings);
        } catch (error) {
            next(error);
        }
    };

    updatePlanning = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const planningId = req.params.planningId;
            const data = req.body as PlanningUpdateInput;
            const planning = await this.planningService.updatePlanning(planningId, data);
            res.json(planning);
        } catch (error) {
            next(error);
        }
    };

    deletePlanning = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const planningId = req.params.planningId;
            await this.planningService.deletePlanning(planningId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}
