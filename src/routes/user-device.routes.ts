import express from 'express';
import { UserDeviceController } from '../controllers/user-device.controller';
import authMiddleware from '../middleware/auth.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import { z } from 'zod';

const router = express.Router();
const userDeviceController = new UserDeviceController();

// Define validation schemas
const userIdSchema = z.object({
  params: z.object({
    userId: z.string().min(1, 'User ID is required')
  })
});

const deviceIdSchema = z.object({
  params: z.object({
    deviceId: z.string()
      .transform((val) => parseInt(val))
      .refine((val) => val > 0, 'Device ID must be a positive number')
  })
});

// Routes
router.get('/me', authMiddleware, userDeviceController.getOwnDevices); // User's own devices

router.get(
  '/:userId',
  authMiddleware,
  validateMiddleware(userIdSchema),
  userDeviceController.getUserDevices
); // Admin: any user's devices

router.delete(
  '/:deviceId',
  authMiddleware,
  validateMiddleware(deviceIdSchema),
  userDeviceController.revokeDevice
); // Revoke device

export default router;