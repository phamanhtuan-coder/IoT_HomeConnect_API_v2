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


router.get(
    '/',
    // authMiddleware,
    asyncHandler(customerSearchController.searchCustomer.bind(customerSearchController))
);

// Lock customer account
router.put(
    '/lock/:customerId', 

    asyncHandler(customerSearchController.lockCustomer.bind(customerSearchController))
    
);
// Unlock customer account
router.put(
    '/unlock/:customerId', 

    asyncHandler(customerSearchController.unlockCustomer.bind(customerSearchController))
);

// Update customer information
router.put(
    '/update/:customerId', 
   
    asyncHandler(customerSearchController.updateCustomer.bind(customerSearchController))
);


// Delete customer account
router.delete(
    '/delete/:customerId', 

    asyncHandler(customerSearchController.deleteCustomer.bind(customerSearchController))
);

// Device management routes
// Lock device
router.put(
    '/devices/:deviceId/:serialNumber/lock',
    // authMiddleware, 
    asyncHandler(customerSearchController.lockDevice.bind(customerSearchController))
);

// Unlock device
router.put(
    '/devices/:deviceId/:serialNumber/unlock',
    // authMiddleware,
    asyncHandler(customerSearchController.unlockDevice.bind(customerSearchController))
);

// Update device
router.put(
    '/devices/:deviceId/:serialNumber',
    // authMiddleware, 
    asyncHandler(customerSearchController.updateDevice.bind(customerSearchController))
);

// Delete device
router.delete(
    '/devices/:deviceId/:serialNumber',
    // authMiddleware, 
    asyncHandler(customerSearchController.deleteDevice.bind(customerSearchController))
);

// Unlink device
router.put(
    '/devices/:deviceId/:serialNumber/unlink',
    asyncHandler(customerSearchController.unlinkDevice.bind(customerSearchController))
);



export default router;
