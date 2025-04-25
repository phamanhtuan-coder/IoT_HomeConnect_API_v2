import { Router, Request, Response, NextFunction } from 'express';
import GroupController from '../controllers/group.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import { groupSchema, groupIdSchema, userGroupSchema, updateGroupRoleSchema } from '../utils/validators';

const router = Router();
const groupController = new GroupController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.post(
    '/',
    authMiddleware,
    validateMiddleware(groupSchema),
    asyncHandler(groupController.createGroup)
);

router.get(
    '/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(groupIdSchema),
    asyncHandler(groupController.getGroup)
);

router.put(
    '/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(groupSchema),
    asyncHandler(groupController.updateGroupName)
);

router.delete(
    '/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(groupIdSchema),
    asyncHandler(groupController.deleteGroup)
);

router.post(
    '/users',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(userGroupSchema),
    asyncHandler(groupController.addUserToGroup)
);

router.put(
    '/:groupId/users',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(updateGroupRoleSchema),
    asyncHandler(groupController.updateUserRole)
);

router.delete(
    '/:groupId/users',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(updateGroupRoleSchema),
    asyncHandler(groupController.removeUserFromGroup)
);

export default router;