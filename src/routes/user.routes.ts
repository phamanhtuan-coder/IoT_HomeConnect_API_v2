import { Router, Request, Response, NextFunction } from 'express';
import { UserController } from '../controllers/user.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import {paginationSchema, userIdSchema, userRegisterSchema} from '../utils/validators';

const router = Router();
const userController = new UserController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

router.get('/', authMiddleware, validateMiddleware(paginationSchema), asyncHandler(userController.getAllUsers));
router.get('/:id', authMiddleware, validateMiddleware(userIdSchema), asyncHandler(userController.getUser));
router.put('/:id', authMiddleware, validateMiddleware(userRegisterSchema.partial()), asyncHandler(userController.updateUser));
router.delete('/:id', authMiddleware, validateMiddleware(userIdSchema), asyncHandler(userController.deleteUser));

export default router;