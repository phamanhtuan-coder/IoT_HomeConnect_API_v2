// src/routes/planning.routes.ts
import { Router } from 'express';
import { PlanningController } from '../controllers/planning.controller';
import authMiddleware from '../middleware/auth.middleware';
import roleMiddleware from '../middleware/role.middleware';
import validateMiddleware from '../middleware/validate.middleware';
import {
    PlanningCreateSchema,
    PlanningApprovalSchema,
    PlanningIdSchema,
    PlanningBatchCreateSchema,
    PlanningBatchUpdateSchema,
} from '../utils/schemas/planning.schema';

const router = Router();
const planningController = new PlanningController();

router.get('/list-batches-completed/:planningId',
    authMiddleware,
    // roleMiddleware,
    // validateMiddleware(PlanningListBatchesCompletedSchema),
    planningController.getListBatchesCompleted
);

router.get('/plannings-by-batch-production-status-is-completed',
    // authMiddleware,
    // roleMiddleware,
    planningController.getPlanningsByBatchProductionStatusIsCompleted
);


//tạo kế hoạch --
router.post(
    '/',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(PlanningCreateSchema),
    planningController.createPlanningApi
);

//lấy kế hoạch theo id --
router.get(
    '/detail/:planningId',
    // authMiddleware,
    validateMiddleware(PlanningIdSchema),
    planningController.getPlanningByIdApi
);

//lấy tất cả kế hoạch  --
router.get(
    '/',
    authMiddleware,
    planningController.getAllPlanningsApi
);

//phê duyệt kế hoạch-- thieu cap nhat is_deleted
router.post(
    '/:planningId/approve',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(PlanningApprovalSchema),
    planningController.approvePlanningApi
);

//tạo lô sản xuất --
router.post(
    '/:planningId/batches',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(PlanningBatchCreateSchema),
    planningController.createBatchApi
);

//lấy lô sản xuất theo id kế hoạch --
router.get(
    '/:planningId/batches',
    authMiddleware,
    validateMiddleware(PlanningIdSchema),
    planningController.getBatchesByPlanningIdApi
);

//cập nhật trạng thái lô sản xuất --
router.put(
    '/batches/:batchId/status',
    authMiddleware,
    // roleMiddleware,
    validateMiddleware(PlanningBatchUpdateSchema),
    planningController.updateBatchStatusApi
);

// src/routes/planning.routes.ts
router.post(
    '/with-batches',
    authMiddleware,
    // roleMiddleware,
    
    planningController.createPlanningWithBatchesApi
);

export default router;