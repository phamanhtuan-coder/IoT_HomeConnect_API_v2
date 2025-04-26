import { Router, Request, Response, NextFunction } from 'express';
import SpaceController from '../controllers/space.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import { spaceSchema, spaceIdSchema } from '../utils/validators';

const router = Router();
const spaceController = new SpaceController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.post(
    '/',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(spaceSchema),
    asyncHandler(spaceController.createSpace)
);

router.get(
    '/house/:houseId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(spaceController.getSpacesByHouse)
);

router.get(
    '/:spaceId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(spaceIdSchema),
    asyncHandler(spaceController.getSpaceById)
);

router.put(
    '/:spaceId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(spaceSchema),
    asyncHandler(spaceController.updateSpace)
);

router.delete(
    '/:spaceId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(spaceIdSchema),
    asyncHandler(spaceController.deleteSpace)
);

router.get(
    '/:spaceId/name',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(spaceIdSchema),
    asyncHandler(spaceController.getSpaceName)
);

export default router;