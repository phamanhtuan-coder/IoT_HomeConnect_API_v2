import {Request, Response, NextFunction} from 'express';
import HourlyValueService from '../services/hourly-value.service';
import {ErrorCodes, throwError} from '../utils/errors';

class HourlyValueController {
    private hourlyValueService: HourlyValueService;

    constructor() {
        this.hourlyValueService = new HourlyValueService();
    }

    /**
     * Tạo giá trị hàng giờ mới
     * @param req Request Express với dữ liệu giá trị hàng giờ trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    createHourlyValue = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const hourlyValue = await this.hourlyValueService.createHourlyValue({...req.body, accountId});
            res.status(201).json(hourlyValue);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thông tin giá trị hàng giờ theo ID
     * @param req Request Express với ID giá trị trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getHourlyValueById = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const {hourlyValueId} = req.params;
            const hourlyValue = await this.hourlyValueService.getHourlyValueById(parseInt(hourlyValueId), accountId);
            res.json(hourlyValue);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách giá trị hàng giờ theo thiết bị
     * @param req Request Express với số seri thiết bị và các tham số truy vấn trong query
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getHourlyValuesByDevice = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const {device_serial, start_time, end_time, page, limit} = req.query;
            const filters = {
                start_time: start_time ? new Date(start_time as string) : undefined,
                end_time: end_time ? new Date(end_time as string) : undefined,
                page: parseInt(page as string) || 1,
                limit: parseInt(limit as string) || 10,
            };
            const hourlyValues = await this.hourlyValueService.getHourlyValuesByDevice(device_serial as string, accountId, filters);
            res.json(hourlyValues);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách giá trị hàng giờ theo không gian
     * @param req Request Express với ID không gian và các tham số truy vấn trong query
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getHourlyValuesBySpace = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { spaceId } = req.params;
            const { start_time, end_time, page, limit} = req.query;
            const filters = {
                start_time: start_time ? new Date(start_time as string) : undefined,
                end_time: end_time ? new Date(end_time as string) : undefined,
                page: parseInt(page as string) || 1,
                limit: parseInt(limit as string) || 10,
            };
            const hourlyValues = await this.hourlyValueService.getHourlyValuesBySpace(parseInt(spaceId as string), accountId, filters);
            res.json(hourlyValues);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật thông tin giá trị hàng giờ
     * @param req Request Express với ID giá trị trong params và dữ liệu cập nhật trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateHourlyValue = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const {hourlyValueId} = req.params;
            const hourlyValue = await this.hourlyValueService.updateHourlyValue(parseInt(hourlyValueId), req.body, accountId);
            res.json(hourlyValue);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xóa giá trị hàng giờ
     * @param req Request Express với ID giá trị trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    deleteHourlyValue = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const {hourlyValueId} = req.params;
            await this.hourlyValueService.deleteHourlyValue(parseInt(hourlyValueId), accountId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thống kê giá trị theo thời gian
     * @param req Request Express với số seri thiết bị và các tham số thống kê trong query
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getStatistics = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const {device_serial, type, start_time, end_time} = req.query;
            const stats = await this.hourlyValueService.getStatistics(
                device_serial as string,
                accountId,
                type as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
                start_time ? new Date(start_time as string) : undefined,
                end_time ? new Date(end_time as string) : undefined
            );

            // Create a chart for visualization
            const chart = {
                type: 'line',
                data: {
                    labels: stats.map((s) => new Date(s.timestamp).toISOString()),
                    datasets: Object.keys(stats[0]?.avg_value || {}).map((key) => ({
                        label: key,
                        data: stats.map((s) => s.avg_value[key] || null),
                        borderColor: this.getChartColor(key),
                        fill: false,
                    })),
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {type: 'time', time: {unit: type === 'custom' ? 'hour' : type}},
                        y: {beginAtZero: true},
                    },
                },
            };

            res.json({stats, chart});
        } catch (error) {
            next(error);
        }
    };

    private getChartColor(key: string): string {
        const colors: { [key: string]: string } = {
            temperature: '#FF6384',
            humidity: '#36A2EB',
            gas: '#FFCE56',
        };
        return colors[key] || '#4BC0C0';
    }
}

export default HourlyValueController;

