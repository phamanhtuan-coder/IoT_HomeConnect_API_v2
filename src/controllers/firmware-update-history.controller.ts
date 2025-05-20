import { Request, Response, NextFunction } from 'express';
import FirmwareUpdateHistoryService from '../services/firmware-update-history.service';
import { ErrorCodes, throwError } from '../utils/errors';

class FirmwareUpdateHistoryController {
    private firmwareUpdateHistoryService: FirmwareUpdateHistoryService;

    constructor() {
        this.firmwareUpdateHistoryService = new FirmwareUpdateHistoryService();
    }

    /**
     * Tạo lịch sử cập nhật firmware mới
     * @param req Request Express với dữ liệu lịch sử cập nhật trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    createFirmwareUpdateHistory = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const firmwareUpdateHistory = await this.firmwareUpdateHistoryService.createFirmwareUpdateHistory(req.body);
            res.status(201).json(firmwareUpdateHistory);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật thông tin lịch sử cập nhật firmware
     * @param req Request Express với ID cập nhật trong params và dữ liệu cập nhật trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateFirmwareUpdateHistory = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { updateId } = req.params;
            const firmwareUpdateHistory = await this.firmwareUpdateHistoryService.updateFirmwareUpdateHistory(parseInt(updateId), req.body);
            res.json(firmwareUpdateHistory);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xóa lịch sử cập nhật firmware
     * @param req Request Express với ID cập nhật trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    deleteFirmwareUpdateHistory = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { updateId } = req.params;
            await this.firmwareUpdateHistoryService.deleteFirmwareUpdateHistory(parseInt(updateId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thông tin lịch sử cập nhật firmware theo ID
     * @param req Request Express với ID cập nhật trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getFirmwareUpdateHistoryById = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { updateId } = req.params;
            const firmwareUpdateHistory = await this.firmwareUpdateHistoryService.getFirmwareUpdateHistoryById(parseInt(updateId), accountId);
            res.json(firmwareUpdateHistory);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách lịch sử cập nhật firmware với các tùy chọn lọc
     * @param req Request Express với tham số truy vấn trong query
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getFirmwareUpdateHistories = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const firmwareUpdateHistories = await this.firmwareUpdateHistoryService.getFirmwareUpdateHistories(req.query, accountId);
            res.json(firmwareUpdateHistories);
        } catch (error) {
            next(error);
        }
    };
}

export default FirmwareUpdateHistoryController;
