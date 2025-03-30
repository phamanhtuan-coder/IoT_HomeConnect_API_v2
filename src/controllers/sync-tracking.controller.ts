import { Request, Response, NextFunction } from 'express';
import { SyncTrackingService } from '../services/sync-tracking.service';
import { throwError, ErrorCodes } from '../utils/errors';

export class SyncTrackingController {
    private syncTrackingService: SyncTrackingService;

    constructor() {
        this.syncTrackingService = new SyncTrackingService();
    }

    // Get user's own sync history
    getOwnSyncHistory = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user?.userId;
        if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User ID not found');
        const history = await this.syncTrackingService.getUserSyncHistory(userId);
        res.json(history);
    };

    // Get sync history for any user (admin only)
    getUserSyncHistory = async (req: Request, res: Response, next: NextFunction) => {
        const requester = req.user;
        if (!requester || requester.role !== 'admin') {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can view other users\' sync history');
        }
        const userId = parseInt(req.params.userId, 10);
        const history = await this.syncTrackingService.getSyncHistoryByUserId(userId);
        res.json(history);
    };
}