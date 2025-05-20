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
 * Yêu cầu xác thực và kiểm tra dữ liệu đầu vào.
 */
router.post(
    '/hourly-values',
    authMiddleware,
    validateMiddleware(hourlyValueSchema),
    asyncHandler(hourlyValueController.createHourlyValue)
);

/**
 * Lấy thông tin HourlyValue theo ID.
 * Yêu cầu xác thực và kiểm tra ID.
 */
router.get(
    '/hourly-values/:hourlyValueId',
    authMiddleware,
    validateMiddleware(hourlyValueIdSchema),
    asyncHandler(hourlyValueController.getHourlyValueById)
);

/**
 * Lấy danh sách HourlyValue theo serial thiết bị.
 * Yêu cầu xác thực và kiểm tra tham số lọc.
 */
router.get(
    '/hourly-values/device/:device_serial',
    authMiddleware,
    validateMiddleware(hourlyValueFilterSchema),
    asyncHandler(hourlyValueController.getHourlyValuesByDevice)
);

/**
 * Lấy danh sách HourlyValue theo không gian.
 * Yêu cầu xác thực và kiểm tra tham số lọc.
 */
router.get(
    '/hourly-values/space/:spaceId',
    authMiddleware,
    validateMiddleware(hourlyValueFilterSchema),
    asyncHandler(hourlyValueController.getHourlyValuesBySpace)
);

/**
 * Cập nhật HourlyValue theo ID.
 * Yêu cầu xác thực và kiểm tra dữ liệu cập nhật.
 */
router.put(
    '/hourly-values/:hourlyValueId',
    authMiddleware,
    validateMiddleware(updateHourlyValueSchema),
    asyncHandler(hourlyValueController.updateHourlyValue)
);

/**
 * Xoá HourlyValue theo ID.
 * Yêu cầu xác thực và kiểm tra ID.
 */
router.delete(
    '/hourly-values/:hourlyValueId',
    authMiddleware,
    validateMiddleware(hourlyValueIdSchema),
    asyncHandler(hourlyValueController.deleteHourlyValue)
);

/**
 * Lấy thống kê HourlyValue theo serial thiết bị.
 * Yêu cầu xác thực.
 */
router.get(
    '/hourly-values/statistics/:device_serial',
    authMiddleware,
    asyncHandler(hourlyValueController.getStatistics)
);

export default router;