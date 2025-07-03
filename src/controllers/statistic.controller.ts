import { Request, Response } from "express";
import { ErrorCodes, throwError } from "../utils/errors";
import StatisticService from "../services/statistic.service";

export class StatisticController {
    private statisticService: StatisticService;

    constructor() {
        this.statisticService = new StatisticService();
    }

    async getStatisticCard(req: Request, res: Response) {
        try {
            const accountId = req.user?.userId;
            if(!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'Không tìm thấy tài khoản');
            }
            const statistic = await this.statisticService.getStatisticCard(accountId as string);
            res.json(statistic);
        } catch (error) {
            console.log(error)
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    async getStatistic(req: Request, res: Response) {
        try {
            const accountId = req.user?.userId;
            if(!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'Không tìm thấy tài khoản');
            }
            const { type, start_time, end_time } = req.query;
            const statistic = await this.statisticService.getStatistic(accountId, type as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom', start_time as unknown as Date, end_time as unknown as Date);
            res.json(statistic);
        } catch (error) {
            console.log(error)
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
}