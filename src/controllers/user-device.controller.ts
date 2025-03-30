import { Request, Response, NextFunction } from 'express';
import { UserDeviceService } from '../services/user-device.service';
import { throwError, ErrorCodes } from '../utils/errors';

export class UserDeviceController {
    private userDeviceService: UserDeviceService;

    constructor() {
        this.userDeviceService = new UserDeviceService();
    }

    // List user's own devices
    getOwnDevices = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user?.userId;
        if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User ID not found');
        const devices = await this.userDeviceService.getUserDevices(userId);
        res.json(devices);
    };

    // List devices for any user (admin only)
    getUserDevices = async (req: Request, res: Response, next: NextFunction) => {
        const requester = req.user;
        if (!requester || requester.role !== 'admin') {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can view other users\' devices');
        }
        const userId = parseInt(req.params.userId, 10);
        const devices = await this.userDeviceService.getDevicesByUserId(userId);
        res.json(devices);
    };

    // Revoke a device
    revokeDevice = async (req: Request, res: Response, next: NextFunction) => {
        const userDeviceId = parseInt(req.params.deviceId, 10);
        const requesterId = req.user?.userId || req.user?.employeeId!;
        const requesterRole = req.user?.role || 'user';
        await this.userDeviceService.revokeDevice(userDeviceId, requesterId, requesterRole);
        res.status(204).send();
    };
}