/**
 * Routes for managing template components.
 * @swagger
 * tags:
 *   name: Template Component
 *   description: Manage relationships between device templates and components
 */

import { Router, Request, Response, NextFunction } from 'express';
import TemplateComponentController from '../controllers/template-component.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import { templateComponentSchema, templateComponentIdSchema } from '../utils/schemas/template-component.schema';

const router = Router();
const templateComponentController = new TemplateComponentController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * @swagger
 * /api/template-components:
 *   post:
 *     tags:
 *       - Template Component
 *     summary: Create a new template component
 *     description: Create a new relationship between a device template and a component
 *     security:
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Template component data
 *         schema:
 *           type: object
 *           required:
 *             - template_id
 *             - component_id
 *           properties:
 *             template_id:
 *               type: number
 *               description: ID of the device template
 *               example: 1
 *             component_id:
 *               type: number
 *               description: ID of the component
 *               example: 1
 *             quantity_required:
 *               type: number
 *               description: Quantity required for the template
 *               example: 1
 *     responses:
 *       201:
 *         description: Template component created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Template component already exists
 *       500:
 *         description: Server error
 */
router.post(
    '/',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(templateComponentSchema),
    asyncHandler(templateComponentController.createTemplateComponent)
);

/**
 * @swagger
 * /api/template-components:
 *   get:
 *     tags:
 *       - Template Component
 *     summary: Get all template components
 *     description: Retrieve a list of all template components
 *     security:
 *       - EmployeeBearer: []
 *     responses:
 *       200:
 *         description: List of template components
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get(
    '/',
    authMiddleware,
    roleMiddleware,
    asyncHandler(templateComponentController.getAllTemplateComponents)
);

/**
 * @swagger
 * /api/template-components/{templateComponentId}:
 *   get:
 *     tags:
 *       - Template Component
 *     summary: Get a template component by ID
 *     description: Retrieve details of a specific template component
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: templateComponentId
 *         required: true
 *         type: string
 *         description: ID of the template component
 *     responses:
 *       200:
 *         description: Template component details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Template component not found
 *       500:
 *         description: Server error
 */
router.get(
    '/:templateComponentId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(templateComponentIdSchema),
    asyncHandler(templateComponentController.getTemplateComponentById)
);

/**
 * @swagger
 * /api/template-components/{templateComponentId}:
 *   put:
 *     tags:
 *       - Template Component
 *     summary: Update a template component
 *     description: Update details of a specific template component
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: templateComponentId
 *         required: true
 *         type: string
 *         description: ID of the template component
 *       - in: body
 *         name: body
 *         description: Updated template component data
 *         schema:
 *           type: object
 *           properties:
 *             template_id:
 *               type: number
 *               description: ID of the device template
 *               example: 1
 *             component_id:
 *               type: number
 *               description: ID of the component
 *               example: 1
 *             quantity_required:
 *               type: number
 *               description: Quantity required for the template
 *               example: 2
 *     responses:
 *       200:
 *         description: Template component updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Template component not found
 *       500:
 *         description: Server error
 */
router.put(
    '/:templateComponentId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(templateComponentSchema),
    asyncHandler(templateComponentController.updateTemplateComponent)
);

/**
 * @swagger
 * /api/template-components/{templateComponentId}:
 *   delete:
 *     tags:
 *       - Template Component
 *     summary: Delete a template component
 *     description: Soft delete a specific template component
 *     security:
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: templateComponentId
 *         required: true
 *         type: string
 *         description: ID of the template component
 *     responses:
 *       204:
 *         description: Template component deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Template component not found
 *       500:
 *         description: Server error
 */
router.delete(
    '/:templateComponentId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(templateComponentIdSchema),
    asyncHandler(templateComponentController.deleteTemplateComponent)
);

export default router;