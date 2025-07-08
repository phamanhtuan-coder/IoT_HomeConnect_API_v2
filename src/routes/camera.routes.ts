import { Router } from 'express';
import CameraController from '../controllers/camera.controller';
import authMiddleware from '../middleware/auth.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import {
    cameraStreamSchema,
    capturePhotoSchema,
    cameraControlSchema,
    cameraConfigSchema,
    cameraParamSchema,
    downloadPhotoSchema
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

// Stream proxy endpoint for MJPEG streaming
router.get(
    '/proxy/:serialNumber',
    authMiddleware,
    validateMiddleware(cameraStreamSchema),
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
    validateMiddleware(cameraParamSchema),
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
    validateMiddleware(cameraParamSchema),
    cameraController.getPhotosList
);

// Download specific photo
router.get(
    '/photos/:serialNumber/:filename',
    authMiddleware,
    validateMiddleware(downloadPhotoSchema),
    cameraController.downloadPhoto
);

// Get camera capabilities
router.get(
    '/capabilities/:serialNumber',
    authMiddleware,
    validateMiddleware(cameraParamSchema),
    cameraController.getCameraCapabilities
);

// Get camera info endpoint
router.get(
    '/info/:serialNumber',
    authMiddleware,
    validateMiddleware(cameraParamSchema),
    cameraController.getCameraInfo
);

export default router;
