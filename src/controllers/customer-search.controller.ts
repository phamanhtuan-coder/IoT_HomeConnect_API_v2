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

    async lockCustomer(req: Request, res: Response) {
        try {
            const { customerId } = req.params;
            const result = await this.customerSearchService.lockCustomer(customerId);
            return res.json(result);
        } catch (error) {
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
    async unlockCustomer(req: Request, res: Response) {
        try {
            const { customerId } = req.params;
            const result = await this.customerSearchService.unlockCustomer(customerId);
            return res.json(result);
        } catch (error) {
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

    async updateCustomer(req: Request, res: Response) {
        try {
            const { customerId } = req.params;
            const updateData = req.body;
            const result = await this.customerSearchService.updateCustomer(customerId, updateData);
            return res.json(result);
        } catch (error) {
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

    async deleteCustomer(req: Request, res: Response) {
        try {
            const { customerId } = req.params;
            const result = await this.customerSearchService.deleteCustomer(customerId);
            return res.json(result);
        } catch (error) {
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
