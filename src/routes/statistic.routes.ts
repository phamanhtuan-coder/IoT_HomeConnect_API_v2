import { Router } from "express";
import { StatisticController } from "../controllers/statistic.controller";
import authMiddleware from '../middleware/auth.middleware';

const router = Router();
const statisticController = new StatisticController();

/**
 * Lấy thống kê card
 */
router.get('/card', authMiddleware, statisticController.getStatisticCard.bind(statisticController));

/**
 * Lấy thống kê spaces (current data)
 */
router.get('/', authMiddleware, statisticController.getStatistic.bind(statisticController));

/**
 * Lấy thống kê theo space với time series
 */
router.get('/space/:spaceId/statistics', authMiddleware, statisticController.getStatisticsBySpace.bind(statisticController));

/**
 * Lấy thống kê theo device với time series
 */
router.get('/statistics/:deviceSerial', authMiddleware, statisticController.getStatisticsByDevice.bind(statisticController));

/**
 * Lấy danh sách thiết bị trong space
 */
router.get('/space/:spaceId/devices', authMiddleware, statisticController.getDevicesInSpace.bind(statisticController));

export default router;