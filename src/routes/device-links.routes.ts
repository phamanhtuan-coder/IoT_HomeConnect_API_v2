import express from 'express';
import DeviceLinksController from '../controllers/device-links.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = express.Router();
const deviceLinksController = new DeviceLinksController();

router.post('/', authMiddleware, (req, res) => deviceLinksController.createDeviceLink(req, res));

router.get('/', authMiddleware, (req, res) => deviceLinksController.getDeviceLinks(req, res));

router.get('/output/:outputDeviceId', authMiddleware, (req, res) => deviceLinksController.getLinksByOutputDevice(req, res));

router.put('/:linkId', authMiddleware, (req, res) => deviceLinksController.updateDeviceLink(req, res));

router.delete('/:linkId', authMiddleware, (req, res) => deviceLinksController.deleteDeviceLink(req, res));

router.post('/:linkId/test', authMiddleware, (req, res) => deviceLinksController.testDeviceLink(req, res));

export default router; 