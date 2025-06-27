import {Request, Response, NextFunction} from 'express';
import DeviceService from '../services/device.service';
import {ErrorCodes, throwError} from '../utils/errors';
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
            const device = await this.deviceService.createDevice({...req.body, accountId});
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
            const {serial_number, spaceId, name} = req.body;
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
                        const {power_status, serial_number} = req.body;
            const device = await this.deviceService.toggleDevice(
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
                        const {serial_number} = req.body;
            const device = await this.deviceService.updateDeviceAttributes(
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
            const { serialNumber } = req.params;
            const device = await this.deviceService.getDeviceById(
                serialNumber,
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
            const { serialNumber } = req.params;
            await this.deviceService.unlinkDevice(serialNumber, accountId);
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
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can update device space');
        }

        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
                        const {spaceId, serial_number} = req.body;
            const device = await this.deviceService.updateDeviceSpace(
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
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can update device WiFi');
        }

        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
                        const {serial_number} = req.body;
            const device = await this.deviceService.updateDeviceWifi(
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

        const { search } = req.query as { search: string };

        try {
            const devices = await this.deviceService.getDevicesByAccount(accountId, search);
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
            const {groupId} = req.params;
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
            const {houseId} = req.params;
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
            const {spaceId} = req.params;
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
            const { serialNumber } = req.params;
            const stateUpdate = req.body;

            const device = await this.deviceService.updateDeviceState(
                serialNumber,
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
            const { serialNumber } = req.params;
            const state = await this.deviceService.getDeviceState(
                serialNumber,
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
            const { serialNumber } = req.params;
            const { updates } = req.body;

            const device = await this.deviceService.updateDeviceBulkState(
                serialNumber,
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
            const { serialNumber } = req.params;
            const { power_status } = req.body;

            const device = await this.deviceService.updateDeviceState(
                serialNumber,
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
                        const {serial_number} = req.body;

            if (!serial_number) {
                throwError(ErrorCodes.BAD_REQUEST, 'Số seri thiết bị không hợp lệ');
            }

            const capabilities = await this.deviceService.getDeviceCapabilities(
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
                        const {serial_number, capabilities} = req.body;

            if (!serial_number) {
                throwError(ErrorCodes.BAD_REQUEST, 'serial_number is required');
            }

            if (!capabilities || typeof capabilities !== 'object') {
                throwError(ErrorCodes.BAD_REQUEST, 'capabilities object is required');
            }

            await this.deviceService.updateDeviceCapabilities(
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
     * Get LED capabilities
     * GET /devices/:deviceId/led-capabilities
     */
    getLEDCapabilities = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
                        const {serial_number} = req.body;

            if (!serial_number) {
                throwError(ErrorCodes.BAD_REQUEST, 'serial_number is required');
            }

            const ledCapabilities = {
                serial_number,
                supported_effects: [
                    'solid', 'blink', 'breathe', 'rainbow', 'chase',
                    'fade', 'strobe', 'sparkle', 'colorWave', 'rainbowMove',
                    'disco', 'meteor', 'pulse', 'twinkle', 'fireworks'
                ],
                supported_presets: [
                    'party_mode', 'relaxation_mode', 'gaming_mode', 'alarm_mode',
                    'sleep_mode', 'wake_up_mode', 'focus_mode', 'movie_mode',
                    'romantic_mode', 'celebration_mode', 'rainbow_dance',
                    'ocean_wave', 'meteor_shower', 'christmas_mode', 'disco_fever'
                ],
                preset_descriptions: {
                    'party_mode': 'Ánh sáng disco nhấp nháy nhanh và đầy năng lượng',
                    'relaxation_mode': 'Ánh sáng tím nhẹ nhàng, nhịp đập chậm',
                    'gaming_Mode': 'Sóng màu rực rỡ, năng động',
                    'alarm_mode': 'Đèn nháy màu đỏ dồn dập, mạnh mẽ cho tình huống khẩn cấp',
                    'sleep_mode': 'Ánh sáng ấm áp, nhẹ nhàng như hơi thở',
                    'wake_up_mode': 'Mô phỏng bình minh dịu nhẹ',
                    'focus_mode': 'Ánh sáng xanh da trời ổn định, tạo sự tập trung',
                    'movie_mode': 'Ánh xanh sâu, nhịp thở nhẹ nhàng tạo không gian',
                    'romantic_mode': 'Ánh hồng nhấp nháy nhẹ nhàng, thường xuyên tạo không gian lãng mạn',
                    'celebration_mode': 'Pháo hoa vàng rực rỡ, bùng nổ',
                    'rainbow_dance': 'Cầu vồng chuyển động rực rỡ, siêu nhanh',
                    'ocean_wave': 'Sóng biển xanh dịu dàng, chảy trôi',
                    'meteor_shower': 'Mưa sao băng trắng rơi nhanh, đầy kịch tính',
                    'christmas_mode': 'Sóng màu đỏ-xanh lá lễ hội, năng động',
                    'disco_fever': 'Đèn disco đa màu rực rỡ, siêu nhanh'
                },
                parameters: {
                    speed: {
                        min: 50,
                        max: 5000,
                        default: 500,
                        description: 'Tốc độ hiệu ứng tính bằng mili giây (giá trị thấp = nhanh hơn)'
                    },
                    brightness: {
                        min: 0,
                        max: 100,
                        default: 100,
                        description: 'Phần trăm độ sáng của đèn LED'
                    },
                    count: {
                        min: 0,
                        max: 100,
                        default: 0,
                        description: 'Số lần lặp lại (0 = vô hạn)'
                    },
                    duration: {
                        min: 0,
                        max: 60000,
                        default: 0,
                        description: 'Thời lượng hiệu ứng tính bằng mili giây (0 = vô hạn)'
                    }
                },
                color_palette: {
                    warm_colors: ['#FF8C69', '#FFE4B5', '#FFDAB9', '#F0E68C'],
                    cool_colors: ['#87CEEB', '#6A5ACD', '#4169E1', '#0077BE'],
                    vibrant_colors: ['#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#FFFF00', '#00FFFF'],
                    festive_colors: ['#FF0000', '#00FF00', '#FFD700', '#FF4500'],
                    romantic_colors: ['#FF69B4', '#FF1493', '#DC143C', '#B22222']
                },
                recommended_combinations: [
                    {
                        name: 'Sắc Hoàng Hôn',
                        effect: 'colorWave',
                        speed: 800,
                        color1: '#FF8C69',
                        color2: '#FF4500',
                        brightness: 80
                    },
                    {
                        name: 'Gió Biển',
                        effect: 'pulse',
                        speed: 3000,
                        color1: '#0077BE',
                        color2: '#40E0D0',
                        brightness: 70
                    },
                    {
                        name: 'Ánh Sáng Rừng',
                        effect: 'twinkle',
                        speed: 600,
                        color1: '#228B22',
                        color2: '#ADFF2F',
                        brightness: 75
                    },
                    {
                        name: 'Sao Thiên Hà',
                        effect: 'meteor',
                        speed: 300,
                        color1: '#9370DB',
                        color2: '#4B0082',
                        brightness: 85
                    }
                ],
                performance_notes: {
                    disco: 'Sử dụng CPU cao - giảm tốc độ nếu ESP8266 trở nên không ổn định',
                    fireworks: 'Hoạt ảnh phức tạp - có thể cần điều chỉnh trên thiết bị chậm hơn',
                    meteor: 'Sử dụng nhiều bộ nhớ do tính toán vệt sáng',
                    colorWave: 'Hiệu suất mượt mà, phù hợp cho sử dụng liên tục',
                    rainbowMove: 'Tốc độ cập nhật cao - đảm bảo nguồn điện ổn định',
                    disco_fever: 'Hiệu ứng siêu nhanh - giới hạn thời lượng để tránh quá nhiệt'
                },
                timestamp: new Date().toISOString()
            };

            res.json({
                success: true,
                ledCapabilities,
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
    applyLEDPreset = async (req: Request, res: Response) => {
        try {
            const { serial_number, preset, duration } = req.body;
            const accountId = req.user?.userId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            }

            const device = await this.deviceService.applyLEDPreset(
                serial_number,
                preset,
                duration,
                accountId
                // No io parameter needed
            );

            res.status(200).json({ success: true, data: device });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    };
    /**
     * Set LED dynamic effect
     * POST /devices/:deviceId/led-effect
     */
    setLEDEffect = async (req: Request, res: Response) => {
        try {
            const { serial_number, effect, speed, count, duration, color1, color2 } = req.body;
            const accountId = req.user?.userId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            }

            const device = await this.deviceService.setLEDEffect(
                serial_number,
                { effect, speed, count, duration, color1, color2 },
                accountId
                // No io parameter needed
            );

            res.status(200).json({ success: true, data: device });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    };

    /**
     * Stop LED effect
     * POST /devices/:deviceId/stop-led-effect
     */
    stopLEDEffect = async (req: Request, res: Response) => {
        try {
            const { serialNumber } = req.params;
            const accountId = req.user?.userId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            }

            const device = await this.deviceService.stopLEDEffect(
                serialNumber,
                accountId
                // No io parameter needed
            );

            res.status(200).json({ success: true, data: device });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
    };

    /**
     * Get available LED effects
     * GET /devices/:deviceId/led-effects
     */
    getAvailableLEDEffects = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const effects = this.deviceService.getAvailableLEDEffects();

            const effectsWithInfo = [{
                name: 'solid',
                description: 'Màu đơn sắc (chế độ mặc định)',
                params: ['color']
            }, {
                name: 'blink',
                description: 'Nhấp nháy bật/tắt',
                params: ['color1', 'speed', 'count']
            }, {
                name: 'breathe',
                description: 'Hiệu ứng hơi thở (mờ dần/sáng dần)',
                params: ['color1', 'speed']
            }, {name: 'rainbow', description: 'Chu kỳ màu cầu vồng', params: ['speed']}, {
                name: 'chase',
                description: 'Hiệu ứng đuổi theo với pixel chuyển động',
                params: ['color1', 'speed']
            }, {
                name: 'fade',
                description: 'Chuyển màu giữa hai màu',
                params: ['color1', 'color2', 'speed']
            }, {
                name: 'strobe',
                description: 'Hiệu ứng nhấp nháy nhanh',
                params: ['color1', 'speed', 'count']
            }, {name: 'colorWave', description: 'Hiệu ứng sóng với hai màu', params: ['color1', 'color2', 'speed']}];

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

