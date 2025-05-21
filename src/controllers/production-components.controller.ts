import { Request, Response, NextFunction } from 'express';
import ProductionComponentsService from '../services/production-components.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { ProductionComponentInput } from '../types/production-components';

class ProductionComponentsController {
    private productionComponentsService: ProductionComponentsService;

    constructor() {
        this.productionComponentsService = new ProductionComponentsService();
    }

    createProductionComponent = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const data = req.body as ProductionComponentInput;
            const productionComponent = await this.productionComponentsService.createProductionComponent(data);
            res.status(201).json(productionComponent);
        } catch (error) {
            next(error);
        }
    };

    getProductionComponentById = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const { productionComponentId } = req.params;
            const productionComponent = await this.productionComponentsService.getProductionComponentById(
                parseInt(productionComponentId)
            );
            res.json(productionComponent);
        } catch (error) {
            next(error);
        }
    };

    getProductionComponentsByProductionId = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const { productionId } = req.params;
            const productionComponents = await this.productionComponentsService.getProductionComponentsByProductionId(
                parseInt(productionId)
            );
            res.json(productionComponents);
        } catch (error) {
            next(error);
        }
    };

    updateProductionComponent = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const { productionComponentId } = req.params;
            const data = req.body;
            const productionComponent = await this.productionComponentsService.updateProductionComponent(
                parseInt(productionComponentId),
                data
            );
            res.json(productionComponent);
        } catch (error) {
            next(error);
        }
    };

    deleteProductionComponent = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user?.employeeId;
        if (!employeeId) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not authenticated');

        try {
            const { productionComponentId } = req.params;
            await this.productionComponentsService.deleteProductionComponent(parseInt(productionComponentId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

export default ProductionComponentsController;

