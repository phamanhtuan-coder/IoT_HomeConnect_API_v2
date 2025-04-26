import { Router, Request, Response, NextFunction } from 'express';
import HouseController from '../controllers/house.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import groupRoleMiddleware from '../middleware/group.middleware';
import { houseSchema, houseIdSchema } from '../utils/validators';

const router = Router();
const houseController = new HouseController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.post(
    '/',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(houseSchema),
    asyncHandler(houseController.createHouse)
);

router.get(
    '/group/:groupId',
    authMiddleware,
    groupRoleMiddleware,
    asyncHandler(houseController.getHousesByGroup)
);

router.get(
    '/:houseId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(houseIdSchema),
    asyncHandler(houseController.getHouseById)
);

router.put(
    '/:houseId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(houseSchema),
    asyncHandler(houseController.updateHouse)
);

router.delete(
    '/:houseId',
    authMiddleware,
    groupRoleMiddleware,
    validateMiddleware(houseIdSchema),
    asyncHandler(houseController.deleteHouse)
);

export default router;