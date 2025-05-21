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
import {
    deviceIdSchema,
    deviceSchema,
    linkDeviceSchema,
    toggleDeviceSchema,
    updateAttributesSchema, updateWifiSchema
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
 * Bật/tắt thiết bị.
 * @swagger
 * /api/devices/{deviceId}/toggle:
 *   put:
 *     tags:
 *       - Device
 *     summary: Bật/tắt thiết bị
 *     description: Thay đổi trạng thái bật/tắt của thiết bị
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         type: string
 *         description: ID của thiết bị cần thao tác
 *       - in: body
 *         name: body
 *         description: Trạng thái mới của thiết bị
 *         schema:
 *           type: object
 *           required:
 *             - state
 *           properties:
 *             state:
 *               type: boolean
 *               description: true để bật, false để tắt
 *               example: true
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái thiết bị thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền thao tác thiết bị
 *       404:
 *         description: Không tìm thấy thiết bị
 *       500:
 *         description: Lỗi server
 */
router.put(
    '/:deviceId/toggle',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(toggleDeviceSchema),
    asyncHandler(deviceController.toggleDevice)
);

/**
 * Cập nhật thuộc tính của thiết bị.
 * @swagger
 * /api/devices/{deviceId}/attributes:
 *   put:
 *     tags:
 *       - Device
 *     summary: Cập nhật thuộc tính thiết bị
 *     description: Cập nhật các thuộc tính của thiết bị (nhiệt độ, độ ẩm, v.v.)
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
 *         description: Các thuộc tính cần cập nhật
 *         schema:
 *           type: object
 *           required:
 *             - attributes
 *           properties:
 *             attributes:
 *               type: object
 *               description: Đối tượng chứa các thuộc tính cần cập nhật
 *               example: {
 *                 "temperature": 25,
 *                 "humidity": 60
 *               }
 *     responses:
 *       200:
 *         description: Cập nhật thuộc tính thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền thao tác thiết bị
 *       404:
 *         description: Không tìm thấy thiết bị
 *       500:
 *         description: Lỗi server
 */
router.put(
    '/:deviceId/attributes',
    authMiddleware,
    validateMiddleware(deviceIdSchema),
    validateMiddleware(updateAttributesSchema),
    asyncHandler(deviceController.updateDeviceAttributes)
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
 *         description: Không tìm th���y nhà
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
 * Cập nhật thông tin wifi cho thiết bị.
 * @swagger
 * /api/devices/{deviceId}/wifi:
 *   put:
 *     tags:
 *       - Device
 *     summary: Cập nhật thông tin Wifi của thiết bị
 *     description: |
 *       Cập nhật thông tin kết nối Wifi cho thiết bị.
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
 *         description: Thông tin Wifi mới
 *         schema:
 *           type: object
 *           required:
 *             - ssid
 *             - password
 *           properties:
 *             ssid:
 *               type: string
 *               description: Tên mạng Wifi
 *               example: "MyWifi"
 *             password:
 *               type: string
 *               description: Mật khẩu Wifi
 *               example: "wifi123456"
 *     responses:
 *       200:
 *         description: Cập nhật thông tin Wifi thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không có quyền cập nhật thiết bị
 *       404:
 *         description: Không tìm thấy thiết bị
 *       500:
 *         description: Lỗi server
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
