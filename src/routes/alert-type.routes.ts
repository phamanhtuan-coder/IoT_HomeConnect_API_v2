import { Router, Request, Response, NextFunction } from "express";
import AlertTypeController from "../controllers/alert-type.controller";
import validateMiddleware from "../middleware/validate.middleware";
import authMiddleware from "../middleware/auth.middleware";
import roleMiddleware from "../middleware/role.middleware";
import {
    alertTypeSchema,
    updateAlertTypeSchema,
    alertTypeIdSchema,
} from "../utils/validators";

const router = Router();
const alertTypeController = new AlertTypeController();

const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.post(
    "/",
    authMiddleware,
    roleMiddleware,
    validateMiddleware(alertTypeSchema),
    asyncHandler(alertTypeController.createAlertType)
);

router.put(
    "/:alertTypeId",
    authMiddleware,
    roleMiddleware,
    validateMiddleware(alertTypeIdSchema),
    validateMiddleware(updateAlertTypeSchema),
    asyncHandler(alertTypeController.updateAlertType)
);

router.delete(
    "/:alertTypeId",
    authMiddleware,
    roleMiddleware,
    validateMiddleware(alertTypeIdSchema),
    asyncHandler(alertTypeController.deleteAlertType)
);

router.get(
    "/:alertTypeId",
    authMiddleware,
    validateMiddleware(alertTypeIdSchema),
    asyncHandler(alertTypeController.getAlertTypeById)
);

router.get(
    "/",
    authMiddleware,
    asyncHandler(alertTypeController.getAllAlertTypes)
);

export default router;