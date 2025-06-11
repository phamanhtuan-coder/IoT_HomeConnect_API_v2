import { Request, Response, NextFunction } from 'express';
import { UserDeviceService } from '../services/user-device.service';
import { throwError, ErrorCodes } from '../utils/errors';

export class UserDeviceController {
    private userDeviceService: UserDeviceService;

    constructor() {
        this.userDeviceService = new UserDeviceService();
    }

    /**
     * Lấy danh sách thiết bị đăng nhập của người dùng hiện tại
     * @param req Request Express
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getOwnDevices = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Account ID not found');
        const devices = await this.userDeviceService.getUserDevices(accountId);
        res.json(devices);
    };

    /**
     * Lấy danh sách thiết bị đăng nhập của một người dùng cụ thể
     * @param req Request Express với ID người dùng trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getUserDevices = async (req: Request, res: Response, next: NextFunction) => {
        const requester = req.user;
        if (!requester) {
            throwError(ErrorCodes.UNAUTHORIZED, 'Requester not authenticated');
        } else if (requester.role !== 'ADMIN') {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can view other users\' devices');
        }
        const accountId = req.params.userId;
        const devices = await this.userDeviceService.getDevicesByUserId(accountId);
        res.json(devices);
    };

    /**
     * Thu hồi quyền truy cập của một thiết bị đăng nhập
     * @param req Request Express với ID thiết bị trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    revokeDevice = async (req: Request, res: Response, next: NextFunction) => {
        const userDeviceId = req.params.deviceId;
        const requesterId = req.user?.userId || req.user?.employeeId;
        const requesterRole = req.user?.role || 'user';
        if (!requesterId) throwError(ErrorCodes.UNAUTHORIZED, 'Requester ID not found');
        await this.userDeviceService.revokeDevice(userDeviceId, requesterId, requesterRole);
        res.status(204).send();
    };
}


