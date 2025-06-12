/**
 * Routes for managing device templates.
 * @swagger
 * tags:
 *   name: DeviceTemplate
 *   description: Manage device templates (R&D defined, used for production)
 */
import { Router, Request, Response, NextFunction } from 'express';
import DeviceTemplateController from '../controllers/device-template.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import { DeviceTemplateCreateSchema, DeviceTemplateIdSchema, DeviceTemplateUpdateSchema, ApproveDeviceTemplateSchema, deviceTemplateIdSchema } from '../utils/schemas/device-template.schema';

const router = Router();
const deviceTemplateController = new DeviceTemplateController();

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
 * Tạo một mẫu thiết bị mới.
 * @route POST /api/device-templates
 * @middleware authMiddleware, roleMiddleware, validateMiddleware
 * @body {object} body - Thông tin mẫu thiết bị.
 * @returns {201|400|401|403|409|500} Trạng thái HTTP và thông báo tương ứng.
 */
router.post(
    '/',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(DeviceTemplateCreateSchema),
    asyncHandler(deviceTemplateController.createDeviceTemplate)
);

/**
 * Lấy danh sách tất cả các mẫu thiết bị.
 * @route GET /api/device-templates
 * @middleware authMiddleware, roleMiddleware
 * @returns {200|401|403|500} Trạng thái HTTP và danh sách mẫu thiết bị hoặc thông báo lỗi.
 */
router.get(
    '/',
    authMiddleware,
    // roleMiddleware,
    asyncHandler(deviceTemplateController.getAllDeviceTemplates)
);

/**
 * Lấy thông tin chi tiết của một mẫu thiết bị theo ID.
 * @route GET /api/device-templates/{templateId}
 * @middleware authMiddleware, roleMiddleware, validateMiddleware
 * @param {number} templateId - ID của mẫu thiết bị.
 * @returns {200|401|403|404|500} Trạng thái HTTP và thông tin mẫu thiết bị hoặc thông báo lỗi.
 */
router.get(
    '/:templateId',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(deviceTemplateIdSchema),
    asyncHandler(deviceTemplateController.getDeviceTemplateById)
);

/**
 * Cập nhật thông tin của một mẫu thiết bị theo ID.
 * @route PUT /api/device-templates/{templateId}
 * @middleware authMiddleware, roleMiddleware, validateMiddleware
 * @param {number} templateId - ID của mẫu thiết bị.
 * @body {object} body - Thông tin cập nhật của mẫu thiết bị.
 * @returns {200|400|401|403|404|409|500} Trạng thái HTTP và thông báo tương ứng.
 */
router.put(
    '/:templateId',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(DeviceTemplateUpdateSchema),
    asyncHandler(deviceTemplateController.updateDeviceTemplate)
);

/**
 * Cập nhật thông tin của một mẫu thiết bị theo ID.
 * @route PUT /api/device-templates/approveDevice/{templateId}
 * @middleware authMiddleware, roleMiddleware, validateMiddleware
 * @param {number} templateId - ID của mẫu thiết bị.
 * @body {object} body - Trạng thái của thiết bị.
 * @returns {200|400|401|403|404|409|500} Trạng thái HTTP và thông báo tương ứng.
 */
router.put(
    '/approveDevice/:templateId',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(ApproveDeviceTemplateSchema),
    asyncHandler(deviceTemplateController.approveDeviceTemplate)
);

/**
 * Xóa mềm một mẫu thiết bị theo ID.
 * @route DELETE /api/device-templates/{templateId}
 * @middleware authMiddleware, roleMiddleware, validateMiddleware
 * @param {number} templateId - ID của mẫu thiết bị.
 * @returns {204|401|403|404|500} Trạng thái HTTP và thông báo tương ứng.
 */
router.delete(
    '/:templateId',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(deviceTemplateIdSchema),
    asyncHandler(deviceTemplateController.deleteDeviceTemplate)
);

export default router;