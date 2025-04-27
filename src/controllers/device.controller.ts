import { Request, Response, NextFunction } from 'express';
import DeviceService from '../services/device.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { GroupRole } from '../types/auth';

class DeviceController {
    private deviceService: DeviceService;

    constructor() {
        this.deviceService = new DeviceService();
    }

    createDevice = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can create devices');
        }

        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const device = await this.deviceService.createDevice({ ...req.body, accountId });
            res.status(201).json(device);
        } catch (error) {
            next(error);
        }
    };

    linkDevice = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can link devices');
        }

        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serial_number, spaceId, name } = req.body;
            const device = await this.deviceService.linkDevice(serial_number, spaceId, accountId, name);
            res.json(device);
        } catch (error) {
            next(error);
        }
    };

    toggleDevice = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { power_status } = req.body;
            const device = await this.deviceService.toggleDevice(parseInt(deviceId), power_status, accountId);
            res.json(device);
        } catch (error) {
            next(error);
        }
    };

    updateDeviceAttributes = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const device = await this.deviceService.updateDeviceAttributes(parseInt(deviceId), req.body, accountId);
            res.json(device);
        } catch (error) {
            next(error);
        }
    };

    getDevicesByAccount = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const devices = await this.deviceService.getDevicesByAccount(accountId);
            res.json(devices);
        } catch (error) {
            next(error);
        }
    };

    getDevicesByGroup = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { groupId } = req.params;
            const devices = await this.deviceService.getDevicesByGroup(parseInt(groupId));
            res.json(devices);
        } catch (error) {
            next(error);
        }
    };

    getDevicesByHouse = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { houseId } = req.params;
            const devices = await this.deviceService.getDevicesByHouse(parseInt(houseId));
            res.json(devices);
        } catch (error) {
            next(error);
        }
    };

    getDevicesBySpace = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { spaceId } = req.params;
            const devices = await this.deviceService.getDevicesBySpace(parseInt(spaceId));
            res.json(devices);
        } catch (error) {
            next(error);
        }
    };

    getDeviceById = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const device = await this.deviceService.getDeviceById(parseInt(deviceId), accountId);
            res.json(device);
        } catch (error) {
            next(error);
        }
    };

    unlinkDevice = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can unlink devices');
        }

        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            await this.deviceService.unlinkDevice(parseInt(deviceId), accountId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    updateDeviceSpace = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can update device space');
        }

        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { spaceId } = req.body;
            const device = await this.deviceService.updateDeviceSpace(parseInt(deviceId), spaceId, accountId);
            res.json(device);
        } catch (error) {
            next(error);
        }
    };

    updateDeviceWifi = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can update device WiFi');
        }

        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const device = await this.deviceService.updateDeviceWifi(parseInt(deviceId), req.body, accountId);
            res.json(device);
        } catch (error) {
            next(error);
        }
    };
}

export default DeviceController;