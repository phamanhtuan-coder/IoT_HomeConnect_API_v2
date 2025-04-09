import { Request, Response, NextFunction } from 'express';
import { UserDeviceService } from '../services/user-device.service';
import { throwError, ErrorCodes } from '../utils/errors';

export class UserDeviceController {
    private userDeviceService: UserDeviceService;

    constructor() {
        this.userDeviceService = new UserDeviceService();
    }

    getOwnDevices = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Account ID not found');
        const devices = await this.userDeviceService.getUserDevices(accountId);
        res.json(devices);
    };

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

    revokeDevice = async (req: Request, res: Response, next: NextFunction) => {
        const userDeviceId = parseInt(req.params.deviceId, 10);
        const requesterId = req.user?.userId || req.user?.employeeId;
        const requesterRole = req.user?.role || 'user';
        if (!requesterId) throwError(ErrorCodes.UNAUTHORIZED, 'Requester ID not found');
        await this.userDeviceService.revokeDevice(userDeviceId, requesterId, requesterRole);
        res.status(204).send();
    };
}