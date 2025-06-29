import { Router } from "express";
import { StatisticController } from "../controllers/statistic.controller";
import authMiddleware from '../middleware/auth.middleware';

const statisticRoutes = Router();
const statisticController = new StatisticController();

statisticRoutes.get('/card', authMiddleware, statisticController.getStatisticCard.bind(statisticController));
statisticRoutes.get('/', authMiddleware, statisticController.getStatistic.bind(statisticController));

export default statisticRoutes;