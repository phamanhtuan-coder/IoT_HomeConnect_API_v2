// src/routes/notification.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import NotificationController from '../controllers/notification.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import { notificationSchema, updateNotificationSchema, notificationIdSchema, notificationFilterSchema } from '../utils/validators';

const router = Router();
const notificationController = new NotificationController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.post(
    '/',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(notificationSchema),
    asyncHandler(notificationController.createNotification)
);

router.put(
    '/:id',
    authMiddleware,
    validateMiddleware(notificationIdSchema),
    validateMiddleware(updateNotificationSchema),
    asyncHandler(notificationController.updateNotification)
);

router.delete(
    '/:id',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(notificationIdSchema),
    asyncHandler(notificationController.deleteNotification)
);

router.get(
    '/:id',
    authMiddleware,
    validateMiddleware(notificationIdSchema),
    asyncHandler(notificationController.getNotificationById)
);

router.get(
    '/user',
    authMiddleware,
    asyncHandler(notificationController.getNotificationsByUser)
);

router.get(
    '/',
    authMiddleware,
    roleMiddleware,
    validateMiddleware(notificationFilterSchema),
    asyncHandler(notificationController.getAllNotifications)
);

router.post(
    '/otp',
    asyncHandler(notificationController.sendOtp)
);

export default router;