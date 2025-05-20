import { Request, Response, NextFunction } from 'express';
import FirmwareService from '../services/firmware.service';
import { ErrorCodes, throwError } from '../utils/errors';

class FirmwareController {
    private firmwareService: FirmwareService;

    constructor() {
        this.firmwareService = new FirmwareService();
    }

    /**
     * Tạo firmware mới
     * @param req Request Express với dữ liệu firmware trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
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

    /**
     * Cập nhật thông tin firmware
     * @param req Request Express với ID firmware trong params và dữ liệu cập nhật trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
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

    /**
     * Xóa firmware
     * @param req Request Express với ID firmware trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
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

    /**
     * Lấy thông tin firmware theo ID
     * @param req Request Express với ID firmware trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getFirmwareById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { firmwareId } = req.params;
            const firmware = await this.firmwareService.getFirmwareById(parseInt(firmwareId));
            res.json(firmware);
        } catch (error) {
            next(error);
        }
    };

    /**
     * L���y danh sách tất cả firmware
     * @param req Request Express
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
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

