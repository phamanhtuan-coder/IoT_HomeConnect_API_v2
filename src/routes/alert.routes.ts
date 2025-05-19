import { Router, Request, Response, NextFunction } from "express";
import AlertController from "../controllers/alert.controller";
import validateMiddleware from "../middleware/validate.middleware";
import authMiddleware from "../middleware/auth.middleware";
import roleMiddleware from "../middleware/role.middleware";
import { alertSchema, updateAlertSchema, alertIdSchema } from "../utils/validators";

const router = Router();
const alertController = new AlertController();

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
    validateMiddleware(alertSchema),
    asyncHandler(alertController.createAlert)
);

router.put(
    "/:alertId",
    authMiddleware,
    roleMiddleware,
    validateMiddleware(alertIdSchema),
    validateMiddleware(updateAlertSchema),
    asyncHandler(alertController.updateAlert)
);

router.delete(
    "/:alertId/soft",
    authMiddleware,
    roleMiddleware,
    validateMiddleware(alertIdSchema),
    asyncHandler(alertController.softDeleteAlert)
);

router.delete(
    "/:alertId/hard",
    authMiddleware,
    roleMiddleware,
    validateMiddleware(alertIdSchema),
    asyncHandler(alertController.hardDeleteAlert)
);

router.get(
    "/:alertId",
    authMiddleware,
    validateMiddleware(alertIdSchema),
    asyncHandler(alertController.getAlertById)
);

router.get("/", authMiddleware, asyncHandler(alertController.getAllAlerts));

export default router;