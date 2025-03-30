import { Router, Request, Response, NextFunction } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import {
    employeeFilterSchema,
    employeeIdSchema,
    employeeRegisterSchema,
    paginationSchema,
    permissionIdSchema, updatePermissionSchema
} from '../utils/validators';

const router = Router();
const employeeController = new EmployeeController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.get('/', authMiddleware, validateMiddleware(paginationSchema), asyncHandler(employeeController.getAllEmployees));
router.get(
    '/filter',
    authMiddleware,
    validateMiddleware(employeeFilterSchema),
    asyncHandler(employeeController.filterEmployees)
);
router.get(
    '/:id/permissions',
    authMiddleware,
    validateMiddleware(employeeIdSchema),
    asyncHandler(employeeController.getEmployeePermissions)
);
router.get(
    '/permissions',
    authMiddleware,
    validateMiddleware(paginationSchema),
    asyncHandler(employeeController.getAllPermissions)
);
router.put(
    '/permissions/:permissionId',
    authMiddleware,
    validateMiddleware(permissionIdSchema.merge(updatePermissionSchema)),
    asyncHandler(employeeController.updateEmployeePermission)
);
router.delete(
    '/permissions/:permissionId',
    authMiddleware,
    validateMiddleware(permissionIdSchema),
    asyncHandler(employeeController.deleteEmployeePermission)
);
router.get('/:id', authMiddleware, validateMiddleware(employeeIdSchema), asyncHandler(employeeController.getEmployee));
router.put(
    '/:id',
    authMiddleware,
    validateMiddleware(employeeRegisterSchema.partial()),
    asyncHandler(employeeController.updateEmployee)
);
router.delete('/:id', authMiddleware, validateMiddleware(employeeIdSchema), asyncHandler(employeeController.deleteEmployee));

export default router;