import { Router, Request, Response, NextFunction } from 'express';
import { CustomerSearchController } from '../controllers/customer-search.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();
const customerSearchController = new CustomerSearchController();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

// GET /api/customer-search
// router.get('/', (req: Request, res: Response) => {
//     customerSearchController.searchCustomer(req, res);
// });

router.get(
    '/',
    // authMiddleware,
    asyncHandler(customerSearchController.searchCustomer.bind(customerSearchController))
);

export default router;
