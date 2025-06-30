/**
 * Định nghĩa các route cho tài nguyên HourlyValue.
 * Sử dụng các middleware xác thực, kiểm tra dữ liệu và xử lý bất đồng bộ.
 *
 * Các route bao gồm:
 * - Tạo mới HourlyValue
 * - Lấy HourlyValue theo ID
 * - Lấy danh sách HourlyValue theo thiết bị hoặc không gian
 * - Cập nhật HourlyValue
 * - Xoá HourlyValue
 * - Lấy thống kê HourlyValue theo thiết bị
 *
 * @swagger
 * tags:
 *  name: Hourly Values
 *  description: Quản lý các giá trị theo giờ của thiết bị
 */

import {Router, Request, Response, NextFunction} from 'express';
import HourlyValueController from '../controllers/hourly-value.controller';
import authMiddleware from '../middleware/auth.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import {
    hourlyValueFilterSchema,
    hourlyValueIdSchema,
    hourlyValueSchema,
    updateHourlyValueSchema
} from "../utils/schemas/hourly-value.schema";

const router = Router();
const hourlyValueController = new HourlyValueController();

/**
 * Hàm helper để xử lý các controller bất đồng bộ và bắt lỗi.
 * @param fn Hàm controller bất đồng bộ
 * @returns Middleware Express xử lý lỗi
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Tạo mới một HourlyValue.
 * @swagger
 * /api/hourly-values:
 *   post:
 *     tags:
 *       - Hourly Values
 *     summary: Tạo giá trị theo giờ mới
 *     description: |
 *       Tạo một bản ghi giá trị theo giờ mới cho thiết bị.
 *       Yêu cầu xác thực (User hoặc Employee Token).
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin giá trị theo giờ cần tạo
 *         schema:
 *           type: object
 *           required:
 *             - device_serial
 *             - timestamp
 *             - values
 *           properties:
 *             device_serial:
 *               type: string
 *               description: Số serial của thiết bị
 *               example: "TEMP001"
 *             timestamp:
 *               type: string
 *               format: date-time
 *               description: Thời điểm ghi nhận giá trị
 *               example: "2025-05-21T10:00:00Z"
 *             values:
 *               type: object
 *               description: Các giá trị đo được
 *               example: {
 *                 "temperature": 25.5,
 *                 "humidity": 60
 *               }
 *     responses:
 *       201:
 *         description: Tạo giá trị thành công
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.post(
    '/',
    authMiddleware,
    validateMiddleware(hourlyValueSchema),
    asyncHandler(hourlyValueController.createHourlyValue)
);

/**
 * Lấy thông tin HourlyValue theo ID.
 * @swagger
 * /api/hourly-values/{hourlyValueId}:
 *   get:
 *     tags:
 *       - Hourly Values
 *     summary: Lấy thông tin giá trị theo ID
 *     description: |
 *       Lấy thông tin chi tiết của một giá trị theo giờ.
 *       Yêu cầu xác thực (User hoặc Employee Token).
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: hourlyValueId
 *         required: true
 *         type: string
 *         description: ID của giá trị cần xem
 *     responses:
 *       200:
 *         description: Trả về thông tin chi tiết của giá trị
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: number
 *               description: ID của bản ghi
 *             device_serial:
 *               type: string
 *               description: Số serial của thiết bị
 *             timestamp:
 *               type: string
 *               format: date-time
 *               description: Thời điểm ghi nhận
 *             values:
 *               type: object
 *               description: Các giá trị đo được
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       404:
 *         description: Không tìm thấy giá trị với ID đã cho
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/:hourlyValueId',
    authMiddleware,
    validateMiddleware(hourlyValueIdSchema),
    asyncHandler(hourlyValueController.getHourlyValueById)
);

/**
 * Lấy danh sách HourlyValue theo serial thiết bị.
 * @swagger
 * /api/hourly-values/device/{device_serial}:
 *   get:
 *     tags:
 *       - Hourly Values
 *     summary: Lấy danh sách giá trị theo thiết bị
 *     description: |
 *       Lấy danh sách giá trị theo giờ của một thiết bị.
 *       Hỗ trợ lọc theo khoảng thời gian.
 *       Yêu cầu xác thực (User hoặc Employee Token).
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     parameters:
 *       - in: path
 *         name: device_serial
 *         required: true
 *         type: string
 *         description: Số serial của thiết bị
 *       - in: query
 *         name: from_date
 *         type: string
 *         format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD)
 *       - in: query
 *         name: to_date
 *         type: string
 *         format: date
 *         description: Ngày kết thúc (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Trả về danh sách giá trị
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: number
 *                 description: ID của bản ghi
 *               device_serial:
 *                 type: string
 *                 description: Số serial của thiết bị
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Thời điểm ghi nhận
 *               values:
 *                 type: object
 *                 description: Các giá trị đo được
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.get(
    '/device/:device_serial',
    authMiddleware,
    validateMiddleware(hourlyValueFilterSchema),
    asyncHandler(hourlyValueController.getHourlyValuesByDevice)
);

/**
 * Lấy danh sách HourlyValue theo không gian.
 * Yêu cầu xác thực và kiểm tra tham số lọc.
 */
router.get(
    '/space/:spaceId',
    authMiddleware,
    validateMiddleware(hourlyValueFilterSchema),
    asyncHandler(hourlyValueController.getHourlyValuesBySpace)
);

/**
 * Cập nhật HourlyValue theo ID.
 * Yêu cầu xác thực và kiểm tra dữ liệu cập nhật.
 */
router.put(
    '/:hourlyValueId',
    authMiddleware,
    validateMiddleware(updateHourlyValueSchema),
    asyncHandler(hourlyValueController.updateHourlyValue)
);

/**
 * Xoá HourlyValue theo ID.
 * Yêu cầu xác thực và kiểm tra ID.
 */
router.delete(
    '/:hourlyValueId',
    authMiddleware,
    validateMiddleware(hourlyValueIdSchema),
    asyncHandler(hourlyValueController.deleteHourlyValue)
);

/**
 * Lấy thống kê HourlyValue theo serial thiết bị.
 * @swagger
 * /api/hourly-values/statistics/{device_serial}:
 *   get:
 *     tags:
 *       - Hourly Value
 *     summary: Lấy thống kê giá trị theo thiết bị
 *     description: Lấy thống kê tổng hợp các giá trị hourly của một thiết bị
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: device_serial
 *         required: true
 *         type: string
 *         description: Serial number của thiết bị
 *       - in: query
 *         name: type
 *         required: true
 *         type: string
 *         enum: [daily, weekly, monthly, yearly, custom]
 *         description: Loại thống kê theo thời gian
 *       - in: query
 *         name: start_time
 *         type: string
 *         format: date-time
 *         description: Thời gian bắt đầu (cho custom)
 *       - in: query
 *         name: end_time
 *         type: string
 *         format: date-time
 *         description: Thời gian kết thúc (cho custom)
 *     responses:
 *       200:
 *         description: Thành công
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy thiết bị
 */
router.get(
    '/statistics/:device_serial',
    authMiddleware,
    asyncHandler(hourlyValueController.getStatistics)
);

/**
 * Lấy thống kê theo space
 * @swagger
 * /api/hourly-values/space/{spaceId}/statistics:
 *   get:
 *     tags:
 *       - Hourly Value
 *     summary: Lấy thống kê giá trị theo space
 *     description: Lấy thống kê tổng hợp các giá trị hourly của tất cả thiết bị trong space
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         type: number
 *         description: ID của space cần lấy thống kê
 *       - in: query
 *         name: type
 *         required: true
 *         type: string
 *         enum: [daily, weekly, monthly, yearly, custom]
 *         description: Loại thống kê theo thời gian
 *       - in: query
 *         name: start_time
 *         type: string
 *         format: date-time
 *         description: Thời gian bắt đầu (cho custom)
 *       - in: query
 *         name: end_time
 *         type: string
 *         format: date-time
 *         description: Thời gian kết thúc (cho custom)
 *     responses:
 *       200:
 *         description: Thành công
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập space
 *       404:
 *         description: Không tìm thấy space
 */
router.get(
    '/space/:spaceId/statistics',
    authMiddleware,
    asyncHandler(hourlyValueController.getStatisticsBySpace)
);

/**
 * Lấy danh sách thiết bị trong space
 * @swagger
 * /api/hourly-values/space/{spaceId}/devices:
 *   get:
 *     tags:
 *       - Hourly Value
 *     summary: Lấy danh sách thiết bị trong space
 *     description: Lấy danh sách tất cả thiết bị trong space để chọn xem thống kê
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         type: number
 *         description: ID của space
 *     responses:
 *       200:
 *         description: Danh sách thiết bị
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập space
 *       404:
 *         description: Không tìm thấy space
 */
router.get(
    '/space/:spaceId/devices',
    authMiddleware,
    asyncHandler(hourlyValueController.getDevicesInSpace)
);

/**
 * Lấy hourly values theo space
 * @swagger
 * /api/hourly-values/space/{spaceId}:
 *   get:
 *     tags:
 *       - Hourly Value
 *     summary: Lấy hourly values theo space
 *     description: Lấy danh sách hourly values trong một space
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: spaceId
 *         required: true
 *         type: number
 *         description: ID của space
 *       - in: query
 *         name: start_time
 *         type: string
 *         format: date-time
 *         description: Thời gian bắt đầu
 *       - in: query
 *         name: end_time
 *         type: string
 *         format: date-time
 *         description: Thời gian kết thúc
 *       - in: query
 *         name: page
 *         type: number
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         type: number
 *         description: Số item per page
 *     responses:
 *       200:
 *         description: Danh sách hourly values
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập space
 *       404:
 *         description: Không tìm thấy space
 */
router.get(
    '/space/:spaceId',
    authMiddleware,
    asyncHandler(hourlyValueController.getHourlyValuesBySpace)
);

export default router;

