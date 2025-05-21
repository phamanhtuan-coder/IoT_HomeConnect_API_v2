import { Router, Request, Response, NextFunction } from 'express';
import ProductionComponentsController from '../controllers/production-components.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import { productionComponentSchema, productionComponentIdSchema } from '../utils/schemas/production-components.schema';

/**
 * Routes for managing production components.
 * @swagger
 * tags:
 *   name: Production Components
 *   description: Manage components used in production processes (employee-only access)
 */
const router = Router();
const productionComponentsController = new ProductionComponentsController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * @swagger
 * /api/production-components:
 *   post:
 *     tags:
 *       - Production Components
 *     summary: Create a new production component
 *     description: Create a new record linking a component to a production process
 *     security:
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Production component details
 *         schema:
 *           type: object
 *           required:
 *             - production_id
 *             - component_id
 *           properties:
 *             production_id:
 *               type: number
 *               description: ID of the production record
 *               example: 1
 *             component_id:
 *               type: number
 *               description: ID of the component
 *               example: 1
 *             quantity_used:
 *               type: number
 *               description: Quantity of components used
 *               example: 1
 *     responses:
 *       201:
 *         description: Production component created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Production or component not found
 *       409:
 *         description: Conflict
 *       500:
 *         description: Server error
 */
router.post(
    '/',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(productionComponentSchema),
    asyncHandler(productionComponentsController.createProductionComponent)
);

/**
 * @swagger
 * /api/production-components/{productionComponentId}:
 *   get:
 *     tags:
 *       - Production Components
 *     summary: Get a production component by ID
 *     description: Retrieve details of a specific production component
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: productionComponentId
 *         required: true
 *         type: string
 *         description: ID of the production component
 *     responses:
 *       200:
 *         description: Production component details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Production component not found
 *       500:
 *         description: Server error
 */
router.get(
    '/:productionComponentId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(productionComponentIdSchema),
    asyncHandler(productionComponentsController.getProductionComponentById)
);

/**
 * @swagger
 * /api/production-components/production/{productionId}:
 *   get:
 *     tags:
 *       - Production Components
 *     summary: Get production components by production ID
 *     description: Retrieve all production components for a specific production record
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: productionId
 *         required: true
 *         type: string
 *         description: ID of the production record
 *     responses:
 *       200:
 *         description: List of production components
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Production components not found
 *       500:
 *         description: Server error
 */
router.get(
    '/production/:productionId',
    authMiddleware,
    roleMiddleware,
    asyncHandler(productionComponentsController.getProductionComponentsByProductionId)
);

/**
 * @swagger
 * /api/production-components/{productionComponentId}:
 *   put:
 *     tags:
 *       - Production Components
 *     summary: Update a production component
 *     description: Update details of a specific production component
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: productionComponentId
 *         required: true
 *         type: string
 *         description: ID of the production component
 *       - in: body
 *         name: body
 *         description: Updated production component details
 *         schema:
 *           type: object
 *           properties:
 *             production_id:
 *               type: number
 *               description: ID of the production record
 *               example: 1
 *             component_id:
 *               type: number
 *               description: ID of the component
 *               example: 1
 *             quantity_used:
 *               type: number
 *               description: Quantity of components used
 *               example: 1
 *     responses:
 *       200:
 *         description: Production component updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Production component not found
 *       500:
 *         description: Server error
 */
router.put(
    '/:productionComponentId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(productionComponentSchema),
    asyncHandler(productionComponentsController.updateProductionComponent)
);

/**
 * @swagger
 * /api/production-components/{productionComponentId}:
 *   delete:
 *     tags:
 *       - Production Components
 *     summary: Delete a production component
 *     description: Soft delete a production component by ID
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: productionComponentId
 *         required: true
 *         type: string
 *         description: ID of the production component
 *     responses:
 *       204:
 *         description: Production component deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Production component not found
 *       500:
 *         description: Server error
 */
router.delete(
    '/:productionComponentId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(productionComponentIdSchema),
    asyncHandler(productionComponentsController.deleteProductionComponent)
);

export default router;