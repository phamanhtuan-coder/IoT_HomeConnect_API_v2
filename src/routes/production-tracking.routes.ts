import { Router } from 'express';
import { ProductionTrackingController } from '../controllers/production-tracking.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import { productionTrackingSchema, productionTrackingIdSchema } from '../utils/schemas/production-tracking.schema';

const router = Router();
const productionTrackingController = new ProductionTrackingController();

/**
 * @swagger
 * /production-tracking:
 *   post:
 *     tags:
 *       - Production Tracking
 *     summary: Create a new production tracking record
 *     description: Creates a new production tracking record for a device in a production batch
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - production_batch_id
 *               - device_serial
 *               - stage
 *             properties:
 *               production_batch_id:
 *                 type: string
 *                 description: ID of the production batch
 *               device_serial:
 *                 type: string
 *                 description: Serial number of the device
 *               stage:
 *                 type: string
 *                 enum: ['assembly', 'firmware_upload', 'qc', 'packaging']
 *                 description: Production stage
 *               status:
 *                 type: string
 *                 enum: ['pending', 'in_progress', 'completed', 'failed']
 *                 description: Status of the stage
 *               cost:
 *                 type: number
 *                 description: Production cost
 *     responses:
 *       201:
 *         description: Production tracking record created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Production batch or device not found
 *       500:
 *         description: Server error
 */
router.post(
    '/',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(productionTrackingSchema),
    productionTrackingController.createProductionTracking
);

/**
 * @swagger
 * /production-tracking/{productionId}:
 *   get:
 *     tags:
 *       - Production Tracking
 *     summary: Get a production tracking record by ID
 *     description: Retrieves a specific production tracking record by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the production tracking record
 *     responses:
 *       200:
 *         description: Production tracking record retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Production tracking record not found
 *       500:
 *         description: Server error
 */
router.get(
    '/:productionId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(productionTrackingIdSchema),
    productionTrackingController.getProductionTrackingById
);

/**
 * @swagger
 * /production-tracking/batch/{batchId}:
 *   get:
 *     tags:
 *       - Production Tracking
 *     summary: Get production tracking records by batch ID
 *     description: Retrieves all production tracking records for a specific production batch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the production batch
 *     responses:
 *       200:
 *         description: Production tracking records retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
    '/batch/:batchId',
    authMiddleware,
    roleMiddleware,
    productionTrackingController.getProductionTrackingByBatchId
);

/**
 * @swagger
 * /production-tracking/{productionId}:
 *   put:
 *     tags:
 *       - Production Tracking
 *     summary: Update a production tracking record
 *     description: Updates an existing production tracking record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the production tracking record
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stage:
 *                 type: string
 *                 enum: ['assembly', 'firmware_upload', 'qc', 'packaging']
 *               status:
 *                 type: string
 *                 enum: ['pending', 'in_progress', 'completed', 'failed']
 *               cost:
 *                 type: number
 *     responses:
 *       200:
 *         description: Production tracking record updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Production tracking record not found
 *       500:
 *         description: Server error
 */
router.put(
    '/:productionId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(productionTrackingIdSchema),
    productionTrackingController.updateProductionTracking
);

/**
 * @swagger
 * /production-tracking/{productionId}:
 *   delete:
 *     tags:
 *       - Production Tracking
 *     summary: Delete a production tracking record
 *     description: Soft deletes a production tracking record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the production tracking record
 *     responses:
 *       204:
 *         description: Production tracking record deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Production tracking record not found
 *       500:
 *         description: Server error
 */
router.delete(
    '/:productionId',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(productionTrackingIdSchema),
    productionTrackingController.deleteProductionTracking
);

export default router;
