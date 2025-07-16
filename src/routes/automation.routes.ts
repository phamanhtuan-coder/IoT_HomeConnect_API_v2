import { Router, Request, Response, NextFunction } from 'express';
import automationController from '../controllers/automation.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// Tất cả routes đều cần authentication
router.use(authMiddleware);

// Wrapper functions để tránh lỗi TypeScript
const testAutomationHandler = (req: Request, res: Response, next: NextFunction) => {
    automationController.testAutomation(req, res).catch(next);
};

const getDeviceLinksInfoHandler = (req: Request, res: Response, next: NextFunction) => {
    automationController.getDeviceLinksInfo(req, res).catch(next);
};

const getDeviceLinksStatsHandler = (req: Request, res: Response, next: NextFunction) => {
    automationController.getDeviceLinksStats(req, res).catch(next);
};

const getDeviceLinksHandler = (req: Request, res: Response, next: NextFunction) => {
    automationController.getDeviceLinks(req, res).catch(next);
};

router.post('/test', testAutomationHandler);
router.get('/device/:serial_number', getDeviceLinksInfoHandler);
router.get('/stats', getDeviceLinksStatsHandler);
router.get('/links', getDeviceLinksHandler);

export default router; 