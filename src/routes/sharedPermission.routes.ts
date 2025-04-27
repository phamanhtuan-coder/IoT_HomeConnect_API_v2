// src/routes/sharedPermission.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import SharedPermissionController from '../controllers/sharedPermission.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';

const router = Router();
const sharedPermissionController = new SharedPermissionController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.delete(
    '/:permissionId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(sharedPermissionController.revokeShareDevice)
);

router.delete(
    '/recipient/:permissionId',
    authMiddleware,
    asyncHandler(sharedPermissionController.revokeShareByRecipient)
);

export default router;