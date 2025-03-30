import express from 'express';
import { UserDeviceController } from '../controllers/user-device.controller';
import  authMiddleware  from '../middleware/auth.middleware';

const router = express.Router();
const userDeviceController = new UserDeviceController();

router.get('/me', authMiddleware, userDeviceController.getOwnDevices); // User's own devices
router.get('/:userId', authMiddleware, userDeviceController.getUserDevices); // Admin: any user's devices
router.delete('/:deviceId', authMiddleware, userDeviceController.revokeDevice); // Revoke device

export default router;