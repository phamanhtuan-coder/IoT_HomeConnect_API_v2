import { Request, Response, NextFunction } from 'express';
import { SyncTrackingService } from '../services/sync-tracking.service';
import { throwError, ErrorCodes } from '../utils/errors';

export class SyncTrackingController {
    private syncTrackingService: SyncTrackingService;

    constructor() {
        this.syncTrackingService = new SyncTrackingService();
    }

    getOwnSyncHistory = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Account ID not found');
        const history = await this.syncTrackingService.getUserSyncHistory(accountId);
        res.json(history);
    };

    getUserSyncHistory = async (req: Request, res: Response, next: NextFunction) => {
        const requester = req.user;
        if (!requester) {
            throwError(ErrorCodes.UNAUTHORIZED, 'Requester not authenticated');
        } else if (requester.role !== 'ADMIN') {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can view other users\' sync history');
        }
        const accountId = req.params.userId;
        const history = await this.syncTrackingService.getSyncHistoryByUserId(accountId);
        res.json(history);
    };

    getFullUserSyncHistory = async (req: Request, res: Response, next: NextFunction) => {
        const requester = req.user;
        if (!requester) {
            throwError(ErrorCodes.UNAUTHORIZED, 'Requester not authenticated');
        } else if (requester.role !== 'ADMIN') {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can view full sync history');
        }
        const accountId = req.params.userId;
        const history = await this.syncTrackingService.getFullSyncHistory(accountId);
        res.json(history);
    };
}