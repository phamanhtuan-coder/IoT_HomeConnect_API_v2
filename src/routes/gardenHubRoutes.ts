import { Router } from 'express';
import GardenHubController from '../controllers/gardenHubController';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import { z } from 'zod';

const router = Router();
const gardenHubController = new GardenHubController();

// ===== VALIDATION SCHEMAS =====

const ToggleRelaySchema = z.object({
    body: z.object({
        power_status: z.boolean({
            required_error: "power_status is required",
            invalid_type_error: "power_status must be a boolean"
        }).describe("Relay state (true = ON, false = OFF)")
    })
});

const BulkRelaySchema = z.object({
    body: z.object({
        relay_commands: z.array(
            z.object({
                relay_serial: z.string()
                    .min(1, "relay_serial is required")
                    .regex(/^RELAY27JUN2501[A-Z0-9]+$/, "Invalid relay serial format"),
                action: z.enum(['ON', 'OFF', 'TOGGLE'], {
                    required_error: "action is required",
                    invalid_type_error: "action must be ON, OFF, or TOGGLE"
                })
            })
        ).min(1, "At least one relay command is required")
            .max(8, "Maximum 8 relay commands allowed")
    })
});

const PumpControlSchema = z.object({
    body: z.object({
        action: z.enum(['START', 'STOP'], {
            required_error: "action is required",
            invalid_type_error: "action must be START or STOP"
        }),
        reason: z.string().optional().default("Manual control")
    })
});

const RGBControlSchema = z.object({
    body: z.object({
        action: z.enum(['TEST', 'AUTO', 'MANUAL'], {
            required_error: "action is required",
            invalid_type_error: "action must be TEST, AUTO, or MANUAL"
        }),
        color: z.object({
            red: z.number().min(0).max(255),
            green: z.number().min(0).max(255),
            blue: z.number().min(0).max(255)
        }).optional()
    })
});

const EmergencyAlarmSchema = z.object({
    body: z.object({
        action: z.enum(['ACTIVATE', 'DEACTIVATE', 'RESET_OVERRIDE'], {
            required_error: "action is required",
            invalid_type_error: "action must be ACTIVATE, DEACTIVATE, or RESET_OVERRIDE"
        })
    })
});

const RelayParamsSchema = z.object({
    params: z.object({
        relay_serial: z.string()
            .min(1, "relay_serial is required")
            .regex(/^RELAY27JUN2501[A-Z0-9]+$/, "Invalid relay serial format")
    })
});

// ===== ROUTES =====

/**
 * @swagger
 * /api/garden-hub/relays:
 *   get:
 *     tags:
 *       - Garden Hub
 *     summary: Get all relay status
 *     description: Retrieve current status of all 8 relays in the garden hub
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     responses:
 *       200:
 *         description: Relay status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Relay status retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     hub_serial:
 *                       type: string
 *                       example: "MEGA_HUB_GARDEN_001"
 *                     total_relays:
 *                       type: number
 *                       example: 8
 *                     relays:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           relay_serial:
 *                             type: string
 *                           device_name:
 *                             type: string
 *                           current_state:
 *                             type: string
 *                             enum: [ON, OFF, UNKNOWN]
 *                           can_toggle:
 *                             type: boolean
 *       401:
 *         description: Authentication required
 *       403:
 *         description: No permission to access garden hub
 */
router.get(
    '/relays',
    authMiddleware,
    groupRoleMiddleware,
    gardenHubController.getRelayStatus
);

/**
 * @swagger
 * /api/garden-hub/relays/available:
 *   get:
 *     tags:
 *       - Garden Hub
 *     summary: Get available relay devices
 *     description: Get list of all available relay devices with their specifications
 *     responses:
 *       200:
 *         description: Available relays retrieved successfully
 */
router.get(
    '/relays/available',
    gardenHubController.getAvailableRelays
);

/**
 * @swagger
 * /api/garden-hub/relays/{relay_serial}/toggle:
 *   post:
 *     tags:
 *       - Garden Hub
 *     summary: Toggle single relay
 *     description: Turn a specific relay ON or OFF
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: relay_serial
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^RELAY27JUN2501[A-Z0-9]+$"
 *         description: Serial number of the relay device
 *         example: "RELAY27JUN2501FAN001CONTROL001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - power_status
 *             properties:
 *               power_status:
 *                 type: boolean
 *                 description: Target state (true = ON, false = OFF)
 *                 example: true
 *     responses:
 *       200:
 *         description: Relay toggled successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: No permission to control relay
 *       404:
 *         description: Relay device not found
 */
router.post(
    '/relays/:relay_serial/toggle',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(RelayParamsSchema),
    validateMiddleware(ToggleRelaySchema),
    gardenHubController.toggleRelay
);

/**
 * @swagger
 * /api/garden-hub/relays/bulk:
 *   post:
 *     tags:
 *       - Garden Hub
 *     summary: Bulk relay control
 *     description: Control multiple relays simultaneously
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - relay_commands
 *             properties:
 *               relay_commands:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 8
 *                 items:
 *                   type: object
 *                   required:
 *                     - relay_serial
 *                     - action
 *                   properties:
 *                     relay_serial:
 *                       type: string
 *                       pattern: "^RELAY27JUN2501[A-Z0-9]+$"
 *                       example: "RELAY27JUN2501LIGHT007CONTROL1"
 *                     action:
 *                       type: string
 *                       enum: [ON, OFF, TOGGLE]
 *                       example: "ON"
 *                 example:
 *                   - relay_serial: "RELAY27JUN2501LIGHT007CONTROL1"
 *                     action: "ON"
 *                   - relay_serial: "RELAY27JUN2501LIGHT008CONTROL1"
 *                     action: "ON"
 *     responses:
 *       200:
 *         description: Bulk relay control completed
 *       400:
 *         description: Invalid relay commands
 *       401:
 *         description: Authentication required
 *       403:
 *         description: No permission to control relays
 */
router.post(
    '/relays/bulk',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(BulkRelaySchema),
    gardenHubController.bulkRelayControl
);

/**
 * @swagger
 * /api/garden-hub/pump:
 *   post:
 *     tags:
 *       - Garden Hub
 *     summary: Control garden pump
 *     description: Start or stop the garden watering pump
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [START, STOP]
 *                 description: Pump action to perform
 *                 example: "START"
 *               reason:
 *                 type: string
 *                 description: Reason for the action
 *                 example: "Manual watering"
 *                 default: "Manual control"
 *     responses:
 *       200:
 *         description: Pump controlled successfully
 *       400:
 *         description: Invalid action
 *       401:
 *         description: Authentication required
 *       403:
 *         description: No permission to control pump
 */
router.post(
    '/pump',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(PumpControlSchema),
    gardenHubController.controlPump
);

/**
 * @swagger
 * /api/garden-hub/rgb:
 *   post:
 *     tags:
 *       - Garden Hub
 *     summary: Control RGB LED
 *     description: Control the RGB LED status indicator for garden system
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [TEST, AUTO, MANUAL]
 *                 description: RGB control action
 *                 example: "TEST"
 *               color:
 *                 type: object
 *                 description: RGB color values (required for MANUAL action)
 *                 properties:
 *                   red:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 255
 *                     example: 255
 *                   green:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 255
 *                     example: 0
 *                   blue:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 255
 *                     example: 0
 *     responses:
 *       200:
 *         description: RGB controlled successfully
 *       400:
 *         description: Invalid action or color values
 *       401:
 *         description: Authentication required
 *       403:
 *         description: No permission to control RGB
 */
router.post(
    '/rgb',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(RGBControlSchema),
    gardenHubController.controlRGB
);

/**
 * @swagger
 * /api/garden-hub/emergency/alarm:
 *   post:
 *     tags:
 *       - Garden Hub
 *     summary: Emergency alarm control
 *     description: Control emergency fire alarm system
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [ACTIVATE, DEACTIVATE, RESET_OVERRIDE]
 *                 description: Emergency alarm action
 *                 example: "ACTIVATE"
 *     responses:
 *       200:
 *         description: Emergency alarm controlled successfully
 *       400:
 *         description: Invalid action
 *       401:
 *         description: Authentication required
 *       403:
 *         description: No permission to control emergency systems
 */
router.post(
    '/emergency/alarm',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(EmergencyAlarmSchema),
    gardenHubController.emergencyAlarm
);

export default router;