import { Request, Response, NextFunction } from 'express';
import DeviceService from '../services/device.service';
import { ErrorCodes, throwError } from '../utils/errors';
import {GroupRole} from "../types/group";
import {LEDEffectInput} from "../types/device-state";

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

    /**
     * Unified device state update endpoint
     * PATCH /devices/:deviceId/state
     */
    updateDeviceState = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { serial_number, ...stateUpdate } = req.body;

            if (!serial_number) {
                throwError(ErrorCodes.BAD_REQUEST, 'serial_number is required');
            }

            const device = await this.deviceService.updateDeviceState(
                deviceId,
                serial_number,
                stateUpdate,
                accountId
            );

            res.json({
                success: true,
                device,
                message: 'Device state updated successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get current device state
     * GET /devices/:deviceId/state
     */
    getDeviceState = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { serial_number } = req.query;

            if (!serial_number) {
                throwError(ErrorCodes.BAD_REQUEST, 'serial_number is required');
            }

            const state = await this.deviceService.getDeviceState(
                deviceId,
                serial_number as string,
                accountId
            );

            res.json({
                success: true,
                state,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Bulk state update for multiple properties
     * POST /devices/:deviceId/state/bulk
     */
    updateDeviceBulkState = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { serial_number, updates } = req.body;

            if (!serial_number || !Array.isArray(updates)) {
                throwError(ErrorCodes.BAD_REQUEST, 'serial_number and updates array are required');
            }

            const device = await this.deviceService.updateDeviceBulkState(
                deviceId,
                serial_number,
                updates,
                accountId
            );

            res.json({
                success: true,
                device,
                message: 'Device bulk state updated successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Quick toggle device power (convenience endpoint)
     * POST /devices/:deviceId/toggle
     */
    quickToggleDevice = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { serial_number, power_status } = req.body;

            const device = await this.deviceService.updateDeviceState(
                deviceId,
                serial_number,
                { power_status: power_status !== undefined ? power_status : true },
                accountId
            );

            res.json({
                success: true,
                device,
                message: `Device ${power_status ? 'turned on' : 'turned off'} successfully`
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get device capabilities
     * GET /devices/:deviceId/capabilities
     */
    getDeviceCapabilities = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { serial_number } = req.body;

            if (!serial_number) {
                throwError(ErrorCodes.BAD_REQUEST, 'Số seri thiết bị không hợp lệ');
            }

            const capabilities = await this.deviceService.getDeviceCapabilities(
                deviceId,
                serial_number,
            );

            res.json({
                success: true,
                capabilities,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Update device runtime capabilities
     * PUT /devices/:deviceId/capabilities
     */
    updateDeviceCapabilities = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { serial_number, capabilities } = req.body;

            if (!serial_number) {
                throwError(ErrorCodes.BAD_REQUEST, 'serial_number is required');
            }

            if (!capabilities || typeof capabilities !== 'object') {
                throwError(ErrorCodes.BAD_REQUEST, 'capabilities object is required');
            }

            await this.deviceService.updateDeviceCapabilities(
                deviceId,
                serial_number,
                capabilities
            );

            res.json({
                success: true,
                message: 'Device capabilities updated successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };



    /**
     * Apply LED effect preset
     * POST /devices/:deviceId/led-preset
     */
    applyLEDPreset = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { serial_number, preset, duration } = req.body;

            if (!serial_number || !preset) {
                throwError(ErrorCodes.BAD_REQUEST, 'serial_number and preset are required');
            }

            const device = await this.deviceService.applyLEDPreset(
                deviceId,
                serial_number,
                preset,
                duration,
                accountId,
                req.app.get('io')
            );

            res.json({
                success: true,
                device,
                message: `LED preset '${preset}' applied successfully`
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Set LED dynamic effect
     * POST /devices/:deviceId/led-effect
     */
    setLEDEffect = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { serial_number, effect, speed, count, duration, color1, color2 } = req.body;

            if (!serial_number || !effect) {
                throwError(ErrorCodes.BAD_REQUEST, 'serial_number and effect are required');
            }

            const effectInput: LEDEffectInput = {
                effect,
                speed,
                count,
                duration,
                color1,
                color2
            };

            const device = await this.deviceService.setLEDEffect(
                deviceId,
                serial_number,
                effectInput,
                accountId,
                req.app.get('io')
            );

            res.json({
                success: true,
                device,
                message: `LED effect '${effect}' applied successfully`
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Stop LED effect
     * POST /devices/:deviceId/stop-led-effect
     */
    stopLEDEffect = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { deviceId } = req.params;
            const { serial_number } = req.body;

            if (!serial_number) {
                throwError(ErrorCodes.BAD_REQUEST, 'serial_number is required');
            }

            const device = await this.deviceService.stopLEDEffect(
                deviceId,
                serial_number,
                accountId,
                req.app.get('io')
            );

            res.json({
                success: true,
                device,
                message: 'LED effect stopped successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get available LED effects
     * GET /devices/:deviceId/led-effects
     */
    getAvailableLEDEffects = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const effects = this.deviceService.getAvailableLEDEffects();

            const effectsWithInfo = [
                { name: 'solid', description: 'Solid color (default mode)', params: ['color'] },
                { name: 'blink', description: 'Blinking on/off', params: ['color1', 'speed', 'count'] },
                { name: 'breathe', description: 'Breathing effect (fade in/out)', params: ['color1', 'speed'] },
                { name: 'rainbow', description: 'Rainbow color cycle', params: ['speed'] },
                { name: 'chase', description: 'Chase effect with moving pixels', params: ['color1', 'speed'] },
                { name: 'fade', description: 'Fade between two colors', params: ['color1', 'color2', 'speed'] },
                { name: 'strobe', description: 'Fast strobe effect', params: ['color1', 'speed', 'count'] },
                { name: 'colorWave', description: 'Wave effect with two colors', params: ['color1', 'color2', 'speed'] }
            ];

            res.json({
                success: true,
                effects: effectsWithInfo,
                available_effects: effects
            });
        } catch (error) {
            next(error);
        }
    };

}

export default DeviceController;

