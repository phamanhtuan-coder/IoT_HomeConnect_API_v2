// src/routes/shareRequest.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import ShareRequestController from '../controllers/shareRequest.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import { shareRequestSchema, approveShareRequestSchema } from '../utils/validators';

const router = Router();
const shareRequestController = new ShareRequestController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.post(
    '/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(shareRequestSchema),
    asyncHandler(shareRequestController.initiateShareRequest)
);

router.post(
    '/approve/:requestId',
    authMiddleware,
    validateMiddleware(approveShareRequestSchema),
    asyncHandler(shareRequestController.approveShareRequest)
);

router.get(
    '/device/:deviceId/group/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(shareRequestController.getShareRequestsByDevice)
);

router.get(
    '/permissions/device/:deviceId/group/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(shareRequestController.getSharedPermissionsByDevice)
);

router.get(
    '/owner',
    authMiddleware,
    asyncHandler(shareRequestController.getSharedDevicesByOwner)
);

export default router;