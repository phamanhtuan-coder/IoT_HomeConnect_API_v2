import { Router } from 'express';
import deviceCapabilitiesController from '../controllers/device-capabilities.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

/**
 * Thêm mới capability
 */
router.post(
    '/',
    authMiddleware,
    deviceCapabilitiesController.create
);

/**
 * Lấy danh sách capability
 */
router.get(
    '/',
    authMiddleware,
    deviceCapabilitiesController.list
);

/**
 * Xóa mềm capability
 */
router.delete(
    '/:id',
    authMiddleware,
    deviceCapabilitiesController.softDelete
);

export default router; 