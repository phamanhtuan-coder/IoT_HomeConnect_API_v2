import { Request, Response, NextFunction } from 'express';
import FirmwareService from '../services/firmware.service';
import { ErrorCodes, throwError } from '../utils/errors';

class FirmwareController {
    private firmwareService: FirmwareService;

    constructor() {
        this.firmwareService = new FirmwareService();
    }

    createFirmware = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const firmware = await this.firmwareService.createFirmware(req.body);
            res.status(201).json(firmware);
        } catch (error) {
            next(error);
        }
    };

    updateFirmware = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { firmwareId } = req.params;
            const firmware = await this.firmwareService.updateFirmware(parseInt(firmwareId), req.body);
            res.json(firmware);
        } catch (error) {
            next(error);
        }
    };

    deleteFirmware = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { firmwareId } = req.params;
            await this.firmwareService.deleteFirmware(parseInt(firmwareId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    getFirmwareById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { firmwareId } = req.params;
            const firmware = await this.firmwareService.getFirmwareById(parseInt(firmwareId));
            res.json(firmware);
        } catch (error) {
            next(error);
        }
    };

    getFirmwares = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const firmwares = await this.firmwareService.getFirmwares();
            res.json(firmwares);
        } catch (error) {
            next(error);
        }
    };
}

export default FirmwareController;