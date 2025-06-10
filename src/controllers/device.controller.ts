import { Request, Response, NextFunction } from 'express';
import DeviceService from '../services/device.service';
import { ErrorCodes, throwError } from '../utils/errors';
import {GroupRole} from "../types/group";

class DeviceController {
    private deviceService: DeviceService;

    constructor() {
        this.deviceService = new DeviceService();
    }

    /**
     * Tạo thiết bị mới
     * @param req Request Express với dữ liệu thiết bị trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
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

    /**
     * Liên kết thiết bị với không gian
     * @param req Request Express với thông tin liên kết trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
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

    /**
     * Bật/tắt thiết bị
     * @param req Request Express với ID thiết bị trong params và trạng thái trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    toggleDevice = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { power_status, serial_number } = req.body; // Add serial_number
            const device = await this.deviceService.toggleDevice(
                deviceId,
                serial_number,
                power_status,
                accountId
            );
            res.json(device);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật thuộc tính thiết bị
     * @param req Request Express với ID thiết bị trong params và thuộc tính cập nhật trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateDeviceAttributes = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { serial_number } = req.body; // Add serial_number
            const device = await this.deviceService.updateDeviceAttributes(
                deviceId,
                serial_number,
                req.body,
                accountId
            );
            res.json(device);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thông tin thiết bị theo ID
     * @param req Request Express với ID thiết bị trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getDeviceById = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { serial_number } = req.body; // Add serial_number
            const device = await this.deviceService.getDeviceById(
                deviceId,
                serial_number,
                accountId
            );
            res.json(device);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Hủy liên kết thiết bị
     * @param req Request Express với ID thiết bị trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    unlinkDevice = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can unlink devices');
        }

        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { serial_number } = req.body; // Add serial_number
            await this.deviceService.unlinkDevice(deviceId, serial_number, accountId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật không gian của thiết bị
     * @param req Request Express với ID thiết bị trong params và ID không gian trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateDeviceSpace = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can update device.ts space');
        }

        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { spaceId, serial_number } = req.body; // Add serial_number
            const device = await this.deviceService.updateDeviceSpace(
                deviceId,
                serial_number,
                spaceId,
                accountId
            );
            res.json(device);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật thông tin WiFi của thiết bị
     * @param req Request Express với ID thiết bị trong params và thông tin WiFi trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateDeviceWifi = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can update device.ts WiFi');
        }

        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { serial_number } = req.body; // Add serial_number
            const device = await this.deviceService.updateDeviceWifi(
                deviceId,
                serial_number,
                req.body,
                accountId
            );
            res.json(device);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách thiết bị theo tài khoản
     * @param req Request Express
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
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

    /**
     * Lấy danh sách thiết bị theo nhóm
     * @param req Request Express với ID nhóm trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getDevicesByGroup = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { groupId } = req.params;
            const devices = await this.deviceService.getDevicesByGroup(parseInt(groupId));
            res.json(devices);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách thiết bị theo nhà
     * @param req Request Express với ID nhà trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getDevicesByHouse = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { houseId } = req.params;
            const devices = await this.deviceService.getDevicesByHouse(parseInt(houseId));
            res.json(devices);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách thiết bị theo không gian
     * @param req Request Express với ID không gian trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getDevicesBySpace = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { spaceId } = req.params;
            const devices = await this.deviceService.getDevicesBySpace(parseInt(spaceId));
            res.json(devices);
        } catch (error) {
            next(error);
        }
    };


}

export default DeviceController;

