import { Request, Response, NextFunction } from 'express';
import OwnershipHistoryService from '../services/ownershipHistory.service';
import {ErrorCodes, throwError} from '../utils/errors';
import { OwnershipTransferInput, ApproveOwnershipTransferInput } from '../utils/validators';

class OwnershipHistoryController {
    private ownershipHistoryService: OwnershipHistoryService;

    constructor() {
        this.ownershipHistoryService = new OwnershipHistoryService();
    }

    async initiateOwnershipTransfer(req: Request, res: Response, next: NextFunction) {
        try {
            const { device_serial, to_user_email } = req.body as OwnershipTransferInput;
            const userId = req.user?.userId || req.user?.employeeId;
            if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

            await this.ownershipHistoryService.initiateOwnershipTransfer({
                device_serial,
                to_user_email,
                from_user_id: userId,
            });

            res.status(201).json({ message: 'Ownership transfer request initiated' });
        } catch (error) {
            next(error);
        }
    }

    async approveOwnershipTransfer(req: Request, res: Response, next: NextFunction) {
        try {
            const { ticketId } = req.params;
            const { accept } = req.body as ApproveOwnershipTransferInput;
            const userId = req.user?.userId || req.user?.employeeId;
            if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

            await this.ownershipHistoryService.approveOwnershipTransfer(parseInt(ticketId), accept, userId);

            res.status(200).json({ message: accept ? 'Ownership transfer approved' : 'Ownership transfer rejected' });
        } catch (error) {
            next(error);
        }
    }

    async getOwnershipHistoryById(req: Request, res: Response, next: NextFunction) {
        try {
            const { historyId } = req.params;
            const history = await this.ownershipHistoryService.getOwnershipHistoryById(parseInt(historyId));
            res.status(200).json(history);
        } catch (error) {
            next(error);
        }
    }

    async getOwnershipHistoryByDevice(req: Request, res: Response, next: NextFunction) {
        try {
            const { device_serial } = req.params;
            const histories = await this.ownershipHistoryService.getOwnershipHistoryByDevice(device_serial);
            res.status(200).json(histories);
        } catch (error) {
            next(error);
        }
    }

    async getOwnershipHistoryByUser(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.userId || req.user?.employeeId;
            if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

            const histories = await this.ownershipHistoryService.getOwnershipHistoryByUser(userId);
            res.status(200).json(histories);
        } catch (error) {
            next(error);
        }
    }

    async deleteOwnershipHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const { historyId } = req.params;
            const userId = req.user?.userId || req.user?.employeeId;
            if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

            await this.ownershipHistoryService.deleteOwnershipHistory(parseInt(historyId), userId);
            res.status(200).json({ message: 'Ownership history deleted' });
        } catch (error) {
            next(error);
        }
    }
}

export default OwnershipHistoryController;