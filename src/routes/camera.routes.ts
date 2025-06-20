import { Router } from 'express';
import CameraController from '../controllers/camera.controller';
import authMiddleware from '../middleware/auth.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import {
    cameraStreamSchema,
    capturePhotoSchema,
    cameraControlSchema,
    cameraConfigSchema
} from '../utils/schemas/camera.schema';

const router = Router();
const cameraController = new CameraController();

// Stream endpoints
router.get(
    '/stream/:serialNumber',
    authMiddleware,
    validateMiddleware(cameraStreamSchema),
    cameraController.getStreamUrl
);

// **NEW: Stream proxy endpoint for MJPEG streaming**
router.get(
    '/proxy/:serialNumber',
    authMiddleware,
    cameraController.proxyStream
);

// Photo capture
router.post(
    '/capture/:serialNumber',
    authMiddleware,
    validateMiddleware(capturePhotoSchema),
    cameraController.capturePhoto
);

// Camera control
router.post(
    '/control/:serialNumber',
    authMiddleware,
    validateMiddleware(cameraControlSchema),
    cameraController.controlCamera
);

// Get camera status
router.get(
    '/status/:serialNumber',
    authMiddleware,
    cameraController.getCameraStatus
);

// Update camera config
router.put(
    '/config/:serialNumber',
    authMiddleware,
    validateMiddleware(cameraConfigSchema),
    cameraController.updateCameraConfig
);

// Get saved photos list
router.get(
    '/photos/:serialNumber',
    authMiddleware,
    cameraController.getPhotosList
);

// Download specific photo
router.get(
    '/photos/:serialNumber/:filename',
    authMiddleware,
    cameraController.downloadPhoto
);

// **NEW: Get camera capabilities**
router.get(
    '/capabilities/:serialNumber',
    authMiddleware,
    cameraController.getCameraCapabilities
);

// **NEW: Get camera info endpoint**
router.get(
    '/info/:serialNumber',
    authMiddleware,
    cameraController.getCameraInfo
);

export default router;
