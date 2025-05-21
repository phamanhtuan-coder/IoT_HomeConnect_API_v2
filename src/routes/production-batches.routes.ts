import { Router } from 'express';
import { ProductionBatchesController } from '../controllers/production-batches.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import {
    productionBatchCreateSchema,
    productionBatchUpdateSchema,
    productionBatchIdSchema
} from '../utils/schemas/production-batches.schema';

const router = Router();
const productionBatchesController = new ProductionBatchesController();

/**
 * @swagger
 * /production-batches:
 *   post:
 *     tags:
 *       - Production Batches
 *     summary: Create a new production batch
 *     description: Creates a new production batch with specified template and quantity
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - template_id
 *               - quantity
 *             properties:
 *               template_id:
 *                 type: integer
 *                 description: ID of the device template
 *               quantity:
 *                 type: integer
 *                 description: Number of devices to produce
 *     responses:
 *       201:
 *         description: Production batch created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Device template not found
 *       500:
 *         description: Server error
 */
router.post(
    '/',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(productionBatchCreateSchema),
    productionBatchesController.createProductionBatch
);

/**
 * @swagger
 * /production-batches/{batchId}:
 *   get:
 *     tags:
 *       - Production Batches
 *     summary: Get a production batch by ID
 *     description: Retrieves detailed information about a specific production batch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the production batch
 *     responses:
 *       200:
 *         description: Production batch retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Production batch not found
 *       500:
 *         description: Server error
 */
router.get(
    '/:batchId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(productionBatchIdSchema),
    productionBatchesController.getProductionBatchById
);

/**
 * @swagger
 * /production-batches:
 *   get:
 *     tags:
 *       - Production Batches
 *     summary: Get all production batches
 *     description: Retrieves a list of all production batches
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of production batches retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
    '/',
    authMiddleware,
    roleMiddleware,
    productionBatchesController.getAllProductionBatches
);

/**
 * @swagger
 * /production-batches/{batchId}:
 *   put:
 *     tags:
 *       - Production Batches
 *     summary: Update a production batch
 *     description: Updates an existing production batch's status or quantity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the production batch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ['pending', 'approved', 'rejected', 'in_progress', 'completed']
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Production batch updated successfully
 *       400:
 *         description: Invalid input data or status transition
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Production batch not found
 *       500:
 *         description: Server error
 */
router.put(
    '/:batchId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(productionBatchUpdateSchema),
    productionBatchesController.updateProductionBatch
);

/**
 * @swagger
 * /production-batches/{batchId}:
 *   delete:
 *     tags:
 *       - Production Batches
 *     summary: Delete a production batch
 *     description: Soft deletes a production batch (only allowed for pending or rejected batches)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the production batch
 *     responses:
 *       204:
 *         description: Production batch deleted successfully
 *       400:
 *         description: Batch cannot be deleted in current status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Production batch not found
 *       500:
 *         description: Server error
 */
router.delete(
    '/:batchId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(productionBatchIdSchema),
    productionBatchesController.deleteProductionBatch
);

export default router;
