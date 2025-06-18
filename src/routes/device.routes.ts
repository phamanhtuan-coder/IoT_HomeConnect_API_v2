/**
 * Định nghĩa các route cho thao tác với thiết bị (device).
 * Sử dụng các middleware xác thực, phân quyền, và kiểm tra dữ liệu đầu vào.
 * @swagger
 * tags:
 *  name: Device
 *  description: Quản lý thiết bị IoT trong hệ thống
 */

import { Router, Request, Response, NextFunction } from 'express';
import DeviceController from '../controllers/device.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import spaceGroupMiddleware from '../middleware/space-group.middleware';
import {
    DeviceBulkStateSchema,
    DeviceCapabilitiesSchema,
    deviceIdSchema,
    deviceSchema, DeviceStateQuerySchema, DeviceStateUpdateSchema, LEDEffectPresetSchema, LEDEffectSchema,
    linkDeviceSchema, QuickToggleSchema, StopLEDEffectSchema,
    toggleDeviceSchema,
    updateAttributesSchema, UpdateDeviceCapabilitiesSchema, updateWifiSchema
} from "../utils/schemas/device.schema";

const router = Router();
const deviceController = new DeviceController();

/**
 * Hàm helper để xử lý bất đồng bộ và bắt lỗi cho các controller.
 * @param fn Hàm controller bất đồng bộ
 * @returns Middleware Express xử lý lỗi
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Tạo thiết bị mới.
 * @swagger
 * /api/devices:
 *   post:
 *     tags:
 *       - Device
 *     summary: Tạo thiết bị mới
 *     description: |
 *       Tạo một thiết bị mới trong hệ thống.
 *       Yêu cầu xác thực và quyền trong nhóm.
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin thiết bị cần tạo
 *         schema:
 *           type: object
 *           required:
 *             - serial
 *             - type
 *             - name
 *           properties:
 *             serial:
 *               type: string
 *               description: Số serial của thiết bị (duy nhất)
 *               example: "DEVICE123"
 *             type:
 *               type: string
 *               description: Loại thiết bị
 *               example: "TEMPERATURE_SENSOR"
 *             name:
 *               type: string
 *               description: Tên thiết bị
 *               example: "Cảm biến nhiệt độ phòng khách"
 *             groupId:
 *               type: number
 *               description: ID của nhóm chứa thiết bị
 *               example: 1
 *             spaceId:
 *               type: number
 *               description: ID của không gian chứa thiết bị
 *               example: 1
 *     responses:
 *       201:
 *         description: Tạo thiết bị thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền trong nhóm
 *       409:
 *         description: Serial đã tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post(
    '/',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(deviceSchema),
    asyncHandler(deviceController.createDevice)
);

/**
 * Liên kết thiết bị với tài khoản hoặc nhóm.
 * @swagger
 * /api/devices/link:
 *   post:
 *     tags:
 *       - Device
 *     summary: Liên kết thiết bị
 *     description: |
 *       Liên kết thiết bị với tài khoản hoặc nhóm người dùng.
 *       Yêu cầu xác thực và quyền trong nhóm.
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin liên kết thiết bị
 *         schema:
 *           type: object
 *           required:
 *             - serial
 *           properties:
 *             serial:
 *               type: string
 *               description: Số serial của thiết bị cần liên kết
 *               example: "DEVICE123"
 *             groupId:
 *               type: number
 *               description: ID của nhóm (nếu liên kết với nhóm)
 *               example: 1
 *     responses:
 *       200:
 *         description: Liên kết thiết bị thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền trong nhóm
 *       404:
 *         description: Không tìm thấy thiết bị với serial đã cho
 *       409:
 *         description: Thiết bị đã được liên kết
 *       500:
 *         description: Lỗi server
 */
router.post(
    '/link',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(linkDeviceSchema),
    asyncHandler(deviceController.linkDevice)
);

/**
 * Lấy danh sách thiết bị theo tài khoản.
 * @swagger
 * /api/devices/account:
 *   get:
 *     tags:
 *       - Device
 *     summary: Lấy danh sách thiết bị của tài khoản
 *     description: Lấy tất cả thiết bị thuộc về tài khoản hiện tại
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     responses:
 *       200:
 *         description: Trả về danh sách thiết bị
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/account',
    authMiddleware,
    asyncHandler(deviceController.getDevicesByAccount)
);

/**
 * Lấy danh sách thiết bị theo nhóm.
 * @swagger
 * /api/devices/group/{groupId}:
 *   get:
 *     tags:
 *       - Device
 *     summary: Lấy danh sách thiết bị của nhóm
 *     description: |
 *       Lấy tất cả thiết bị thuộc về một nhóm cụ thể.
 *       Yêu cầu người dùng có quyền trong nhóm.
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         type: number
 *         description: ID của nhóm cần lấy thiết bị
 *     responses:
 *       200:
 *         description: Trả về danh sách thiết bị của nhóm
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền truy cập nhóm
 *       404:
 *         description: Không tìm thấy nhóm
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/group/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(deviceController.getDevicesByGroup)
);

/**
 * Lấy danh sách thiết bị theo nhà.
 * @swagger
 * /api/devices/house/{houseId}:
 *   get:
 *     tags:
 *       - Device
 *     summary: Lấy danh sách thiết bị trong nhà
 *     description: |
 *       Lấy tất cả thiết bị thuộc về một ngôi nhà cụ thể.
 *       Yêu cầu người dùng có quyền truy cập nhà.
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: houseId
 *         required: true
 *         type: number
 *         description: ID của ngôi nhà cần lấy thiết bị
 *     responses:
 *       200:
 *         description: Trả về danh sách thiết bị trong nhà
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền truy cập nhà
 *       404:
 *         description: Không tìm thấy nhà
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/house/:houseId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(deviceController.getDevicesByHouse)
);

/**
 * Lấy danh sách thiết bị theo không gian.
 * @swagger
 * /api/devices/space/{spaceId}:
 *   get:
 *     tags:
 *       - Device
 *     summary: Lấy danh sách thiết bị trong không gian
 *     description: |
 *       Lấy tất cả thiết bị thuộc về một không gian cụ thể.
 *       Yêu cầu người dùng có quyền truy cập không gian.
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         type: number
 *         description: ID của không gian cần lấy thiết bị
 *     responses:
 *       200:
 *         description: Trả về danh sách thiết bị trong không gian
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền truy cập không gian
 *       404:
 *         description: Không tìm thấy không gian
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/space/:spaceId',
    authMiddleware,
    spaceGroupMiddleware, // Thêm middleware này trước groupRoleMiddleware
    groupRoleMiddleware,
    asyncHandler(deviceController.getDevicesBySpace)
);

/**
 * Lấy thông tin thiết bị theo ID.
 * @swagger
 * /api/devices/{deviceId}:
 *   get:
 *     tags:
 *       - Device
 *     summary: Lấy thông tin chi tiết thiết bị
 *     description: Lấy thông tin chi tiết của một thiết bị theo ID
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID của thiết bị cần xem
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết của thiết bị
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền xem thiết bị
 *       404:
 *         description: Không tìm thấy thiết bị
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/:deviceId',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    asyncHandler(deviceController.getDeviceById)
);

/**
 * Gỡ liên kết thiết bị.
 * @swagger
 * /api/devices/{deviceId}:
 *   delete:
 *     tags:
 *       - Device
 *     summary: Gỡ liên kết thiết bị
 *     description: |
 *       Gỡ liên kết thiết bị khỏi tài khoản hoặc nhóm.
 *       Yêu cầu quyền trong nhóm hoặc sở hữu thiết bị.
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID của thiết bị cần gỡ liên kết
 *     responses:
 *       200:
 *         description: Gỡ liên kết thiết bị thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền gỡ liên kết thiết bị
 *       404:
 *         description: Không tìm thấy thiết bị
 *       500:
 *         description: Lỗi server
 */
router.delete(
    '/:deviceId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(deviceIdSchema),
    asyncHandler(deviceController.unlinkDevice)
);

/**
 * Cập nhật không gian cho thiết bị.
 * @swagger
 * /api/devices/{deviceId}/space:
 *   put:
 *     tags:
 *       - Device
 *     summary: Cập nhật không gian của thiết bị
 *     description: |
 *       Di chuyển thiết bị sang không gian khác.
 *       Yêu cầu quyền trong nhóm chứa thiết bị.
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID của thiết bị cần cập nhật
 *       - in: body
 *         name: body
 *         description: Thông tin không gian mới
 *         schema:
 *           type: object
 *           required:
 *             - spaceId
 *           properties:
 *             spaceId:
 *               type: number
 *               description: ID của không gian mới
 *               example: 2
 *     responses:
 *       200:
 *         description: Cập nhật không gian thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền cập nhật thiết bị
 *       404:
 *         description: Không tìm thấy thiết bị hoặc không gian
 *       500:
 *         description: Lỗi server
 */
router.put(
    '/:deviceId/space',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(deviceIdSchema),
    asyncHandler(deviceController.updateDeviceSpace)
);



/**
 * Update device state (unified)
 * @swagger
 * /api/devices/{deviceId}/state:
 *   patch:
 *     tags:
 *       - Device
 *     summary: Update device state (unified)
 *     description: |
 *       Universal endpoint to update any device state properties.
 *       Supports power, brightness, color, alarm, WiFi settings, etc.
 *       Validates against device capabilities automatically.
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID of the device to update
 *       - in: body
 *         name: body
 *         description: State properties to update
 *         schema:
 *           type: object
 *           required:
 *             - serial_number
 *           properties:
 *             serial_number:
 *               type: string
 *               example: "DEV001"
 *             power_status:
 *               type: boolean
 *               example: true
 *             brightness:
 *               type: number
 *               minimum: 0
 *               maximum: 100
 *               example: 80
 *             color:
 *               type: string
 *               pattern: "^#[0-9A-Fa-f]{6}$"
 *               example: "#FF0000"
 *             alarmActive:
 *               type: boolean
 *               example: false
 *             buzzerOverride:
 *               type: boolean
 *               example: true
 *             wifi_ssid:
 *               type: string
 *               example: "MyNetwork"
 *             wifi_password:
 *               type: string
 *               example: "mypassword123"
 *     responses:
 *       200:
 *         description: Device state updated successfully
 *       400:
 *         description: Invalid input data or capabilities validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Device does not support requested capability
 *       404:
 *         description: Device not found
 */
router.patch(
    '/:deviceId/state',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(DeviceStateUpdateSchema),
    asyncHandler(deviceController.updateDeviceState)
);

/**
 * Get current device state
 * @swagger
 * /api/devices/{deviceId}/state:
 *   get:
 *     tags:
 *       - Device
 *     summary: Get current device state
 *     description: Retrieve the current state of all device properties
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID of the device
 *       - in: query
 *         name: serial_number
 *         required: true
 *         type: string
 *         description: Serial number of the device
 *     responses:
 *       200:
 *         description: Current device state
 *       401:
 *         description: Authentication required
 *       403:
 *         description: No permission to access device
 *       404:
 *         description: Device not found
 */
router.get(
    '/:deviceId/state',
    authMiddleware,
    validateMiddleware(DeviceStateQuerySchema),
    asyncHandler(deviceController.getDeviceState)
);

/**
 * Bulk state update
 * @swagger
 * /api/devices/{deviceId}/state/bulk:
 *   post:
 *     tags:
 *       - Device
 *     summary: Update multiple device properties at once
 *     description: Apply multiple state changes in a single request
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID of the device
 *       - in: body
 *         name: body
 *         description: Array of state updates to apply
 *         schema:
 *           type: object
 *           required:
 *             - serial_number
 *             - updates
 *           properties:
 *             serial_number:
 *               type: string
 *               example: "DEV001"
 *             updates:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   power_status:
 *                     type: boolean
 *                   brightness:
 *                     type: number
 *                   color:
 *                     type: string
 *               example: [
 *                 {"power_status": true},
 *                 {"brightness": 75},
 *                 {"color": "#00FF00"}
 *               ]
 *     responses:
 *       200:
 *         description: Bulk state update successful
 *       400:
 *         description: Invalid updates array
 */
router.post(
    '/:deviceId/state/bulk',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(DeviceBulkStateSchema),
    asyncHandler(deviceController.updateDeviceBulkState)
);

/**
 * Quick toggle device power
 * @swagger
 * /api/devices/{deviceId}/toggle:
 *   post:
 *     tags:
 *       - Device
 *     summary: Quick toggle device power
 *     description: Convenience endpoint to quickly turn device on/off
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID of the device
 *       - in: body
 *         name: body
 *         schema:
 *           type: object
 *           required:
 *             - serial_number
 *           properties:
 *             serial_number:
 *               type: string
 *               example: "DEV001"
 *             power_status:
 *               type: boolean
 *               description: If not provided, defaults to true
 *               example: true
 *     responses:
 *       200:
 *         description: Device toggled successfully
 */
router.post(
    '/:deviceId/toggle',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(QuickToggleSchema),
    asyncHandler(deviceController.quickToggleDevice)
);

/**
 * Get device capabilities
 * @swagger
 * /api/devices/{deviceId}/capabilities:
 *   post:
 *     tags:
 *       - Device
 *     summary: Get device capabilities
 *     description: |
 *       Retrieve device capabilities merged from template and runtime.
 *       Shows what features the device supports.
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID of the device
 *       - in: body
 *         name: body
 *         schema:
 *           type: object
 *           required:
 *             - serial_number
 *           properties:
 *             serial_number:
 *               type: string
 *               example: "DEV001"
 *     responses:
 *       200:
 *         description: Device capabilities retrieved
 *         schema:
 *           type: object
 *           properties:
 *             base:
 *               type: object
 *               description: Base capabilities from template
 *             runtime:
 *               type: object
 *               description: Runtime capabilities from device
 *             merged_capabilities:
 *               type: object
 *               description: Merged capabilities
 *               properties:
 *                 capabilities:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["OUTPUT", "RGB_CONTROL", "BRIGHTNESS_CONTROL"]
 *                 deviceType:
 *                   type: string
 *                   example: "LED_CONTROLLER_24"
 *                 category:
 *                   type: string
 *                   example: "LIGHTING"
 */
router.post(
    '/:deviceId/capabilities',
    authMiddleware,
    validateMiddleware(DeviceCapabilitiesSchema),
    asyncHandler(deviceController.getDeviceCapabilities)
);

/**
 * Update device runtime capabilities
 * @swagger
 * /api/devices/{deviceId}/capabilities:
 *   put:
 *     tags:
 *       - Device
 *     summary: Update device runtime capabilities
 *     description: |
 *       Update the runtime capabilities of a device.
 *       Typically called by IoT devices to report their actual capabilities.
 *       Requires device owner or admin permissions.
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID of the device
 *       - in: body
 *         name: body
 *         description: Runtime capabilities to update
 *         schema:
 *           type: object
 *           required:
 *             - serial_number
 *             - capabilities
 *           properties:
 *             serial_number:
 *               type: string
 *               example: "DEV001"
 *             capabilities:
 *               type: object
 *               properties:
 *                 deviceType:
 *                   type: string
 *                   example: "LED_CONTROLLER_24"
 *                 category:
 *                   type: string
 *                   example: "LIGHTING"
 *                 capabilities:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["OUTPUT", "RGB_CONTROL", "BRIGHTNESS_CONTROL"]
 *                 firmware_version:
 *                   type: string
 *                   example: "8.24"
 *                 isInput:
 *                   type: boolean
 *                   example: false
 *                 isOutput:
 *                   type: boolean
 *                   example: true
 *                 controls:
 *                   type: object
 *                   example: {
 *                     "power_status": "toggle",
 *                     "brightness": "slider",
 *                     "color": "color_picker"
 *                   }
 *     responses:
 *       200:
 *         description: Capabilities updated successfully
 *       400:
 *         description: Invalid capabilities data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: No permission to update device capabilities
 *       404:
 *         description: Device not found
 */
router.put(
    '/:deviceId/capabilities',
    authMiddleware,
    // Note: This endpoint might need special permissions
    // Add groupRoleMiddleware if only group owners should update capabilities
    validateMiddleware(deviceIdSchema),
    validateMiddleware(UpdateDeviceCapabilitiesSchema),
    asyncHandler(deviceController.updateDeviceCapabilities)
);

/**
 * Apply LED effect preset
 * @swagger
 * /api/devices/{deviceId}/led-preset:
 *   post:
 *     tags:
 *       - Device
 *     summary: Apply LED effect preset
 *     description: |
 *       Apply predefined LED effect presets for common scenarios like party mode,
 *       relaxation mode, gaming mode, etc.
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID of the LED device
 *       - in: body
 *         name: body
 *         description: LED preset configuration
 *         schema:
 *           type: object
 *           required:
 *             - serial_number
 *             - preset
 *           properties:
 *             serial_number:
 *               type: string
 *               example: "SERL12JUN2501LED24RGB001"
 *             preset:
 *               type: string
 *               enum: [party_mode, relaxation_mode, gaming_mode, alarm_mode, sleep_mode, wake_up_mode, focus_mode, movie_mode]
 *               example: "party_mode"
 *             duration:
 *               type: integer
 *               minimum: 0
 *               maximum: 300000
 *               example: 30000
 *               description: Preset duration in milliseconds (0 = infinite)
 *     responses:
 *       200:
 *         description: LED preset applied successfully
 *       400:
 *         description: Invalid preset parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: No permission to control device
 *       404:
 *         description: Device not found
 */
router.post(
    '/:deviceId/led-preset',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(LEDEffectPresetSchema),
    asyncHandler(deviceController.applyLEDPreset)
);

// ADD validation to existing routes:
router.post(
    '/:deviceId/led-effect',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(LEDEffectSchema),
    asyncHandler(deviceController.setLEDEffect)
);

router.post(
    '/:deviceId/stop-led-effect',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(StopLEDEffectSchema),
    asyncHandler(deviceController.stopLEDEffect)
);

// ===== BACKWARD COMPATIBILITY ROUTES (DEPRECATED) =====
// These routes are maintained for backward compatibility but should be migrated to unified endpoints

/**
 * @deprecated Use PATCH /devices/:deviceId/state instead
 */
router.put(
    '/:deviceId/toggle',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(toggleDeviceSchema),
    asyncHandler(deviceController.toggleDevice)
);

/**
 * @deprecated Use PATCH /devices/:deviceId/state instead
 */
router.put(
    '/:deviceId/attributes',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(updateAttributesSchema),
    asyncHandler(deviceController.updateDeviceAttributes)
);

/**
 * @deprecated Use PATCH /devices/:deviceId/state instead
 */
router.put(
    '/:deviceId/wifi',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(updateWifiSchema),
    asyncHandler(deviceController.updateDeviceWifi)
);

export default router;
