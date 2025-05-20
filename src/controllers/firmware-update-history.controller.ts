import { Request, Response, NextFunction } from 'express';
import FirmwareUpdateHistoryService from '../services/firmware-update-history.service';
import { ErrorCodes, throwError } from '../utils/errors';

class FirmwareUpdateHistoryController {
    private firmwareUpdateHistoryService: FirmwareUpdateHistoryService;

    constructor() {
        this.firmwareUpdateHistoryService = new FirmwareUpdateHistoryService();
    }

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
