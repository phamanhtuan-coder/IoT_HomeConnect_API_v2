import {Router, Request, Response, NextFunction} from 'express';
import HourlyValueController from '../controllers/hourly-value.controller';
import authMiddleware from '../middleware/auth.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import {
    hourlyValueSchema,
    hourlyValueIdSchema,
    updateHourlyValueSchema,
    hourlyValueFilterSchema
} from '../utils/validators';

const router = Router();
const hourlyValueController = new HourlyValueController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.post(
    '/hourly-values',
    authMiddleware,
    validateMiddleware(hourlyValueSchema),
    asyncHandler(hourlyValueController.createHourlyValue)
);

router.get(
    '/hourly-values/:hourlyValueId',
    authMiddleware,
    validateMiddleware(hourlyValueIdSchema),
    asyncHandler(hourlyValueController.getHourlyValueById)
);

router.get(
    '/hourly-values/device/:device_serial',
    authMiddleware,
    validateMiddleware(hourlyValueFilterSchema),
    asyncHandler(hourlyValueController.getHourlyValuesByDevice)
);

router.get(
    '/hourly-values/space/:spaceId',
    authMiddleware,
    validateMiddleware(hourlyValueFilterSchema),
    asyncHandler(hourlyValueController.getHourlyValuesBySpace)
);

router.put(
    '/hourly-values/:hourlyValueId',
    authMiddleware,
    validateMiddleware(updateHourlyValueSchema),
    asyncHandler(hourlyValueController.updateHourlyValue)
);

router.delete(
    '/hourly-values/:hourlyValueId',
    authMiddleware,
    validateMiddleware(hourlyValueIdSchema),
    asyncHandler(hourlyValueController.deleteHourlyValue)
);

router.get(
    '/hourly-values/statistics/:device_serial',
    authMiddleware,
    asyncHandler(hourlyValueController.getStatistics)
);

export default router;