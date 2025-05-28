import { Router } from 'express';
import { PlanningController } from '../controllers/planning.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import {
    planningCreateSchema,
    planningUpdateSchema,
    planningIdSchema
} from '../utils/schemas/planning.schema';

const router = Router();
const planningController = new PlanningController();

/**
 * @swagger
 * /planning:
 *   post:
 *     tags:
 *       - Planning
 *     summary: Create a new planning
 *     description: Creates a new production planning with specified details
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the planning
 *               description:
 *                 type: string
 *                 description: Description of the planning
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Start date of the planning
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: End date of the planning
 *     responses:
 *       201:
 *         description: Planning created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
    '/',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(planningCreateSchema),
    planningController.createPlanning
);

/**
 * @swagger
 * /planning/{planningId}:
 *   get:
 *     tags:
 *       - Planning
 *     summary: Get a planning by ID
 *     description: Retrieves detailed information about a specific planning
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planningId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the planning
 *     responses:
 *       200:
 *         description: Planning retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Planning not found
 *       500:
 *         description: Server error
 */
router.get(
    '/:planningId',
    authMiddleware,
    validateMiddleware(planningIdSchema),
    planningController.getPlanningById
);

/**
 * @swagger
 * /planning:
 *   get:
 *     tags:
 *       - Planning
 *     summary: Get all plannings
 *     description: Retrieves a list of all production plannings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of plannings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
    '/',
    authMiddleware,
    planningController.getAllPlannings
);

/**
 * @swagger
 * /planning/{planningId}:
 *   put:
 *     tags:
 *       - Planning
 *     summary: Update a planning
 *     description: Updates an existing planning's details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planningId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the planning
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: ['pending', 'in_progress', 'completed']
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Planning updated successfully
 *       400:
 *         description: Invalid input data or status transition
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Planning not found
 *       500:
 *         description: Server error
 */
router.put(
    '/:planningId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(planningUpdateSchema),
    planningController.updatePlanning
);

/**
 * @swagger
 * /planning/{planningId}:
 *   delete:
 *     tags:
 *       - Planning
 *     summary: Delete a planning
 *     description: Soft deletes a planning (only allowed for pending plannings)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planningId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the planning
 *     responses:
 *       204:
 *         description: Planning deleted successfully
 *       400:
 *         description: Planning cannot be deleted in current status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Planning not found
 *       500:
 *         description: Server error
 */
router.delete(
    '/:planningId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(planningIdSchema),
    planningController.deletePlanning
);

export default router;
