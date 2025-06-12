import { Request, Response } from 'express';
import { CustomerSearchService } from '../services/customer-search.service';
import { AppError, ErrorCodes, throwError } from '../utils/errors';

export class CustomerSearchController {
    private customerSearchService: CustomerSearchService;

    constructor() {
        this.customerSearchService = new CustomerSearchService();
    }

    async searchCustomer(req: Request, res: Response) {
        try {
            // const adminId = req.user?.userId || req.user?.employeeId;
            // console.log('adminId', req.user?.employeeId);
            // if (!adminId) {
            //     throwError(ErrorCodes.UNAUTHORIZED, 'Admin not authenticated');
            // }
            const filters = {
                email: req.query.email as string,
                phone: req.query.phone as string,
                name: req.query.name as string,
                customerId: req.query.customerId as string,
                username: req.query.username as string,
                deviceType: req.query.deviceType as string | number,
                status: req.query.status as string,
                role: req.query.role as string
            };

            const result = await this.customerSearchService.searchCustomer(filters);
            return res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.log('error', error);
            if (error instanceof AppError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message
                    }
                });
            }
            return res.status(500).json({
                success: false,
                error: {
                    code: ErrorCodes.INTERNAL_SERVER_ERROR,
                    message: 'Internal server error'
                }
            });
        }
    }
}
