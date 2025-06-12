import { Request, Response, NextFunction } from 'express';
import { SyncTrackingService } from '../services/sync-tracking.service';
import { throwError, ErrorCodes } from '../utils/errors';

export class SyncTrackingController {
    private syncTrackingService: SyncTrackingService;

    constructor() {
        this.syncTrackingService = new SyncTrackingService();
    }

    /**
     * Lấy lịch sử đồng bộ của người dùng hiện tại
     */
    getOwnSyncHistory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const accountId = req.user?.userId || req.user?.employeeId;
            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Account ID not found');

            const history = await this.syncTrackingService.getUserSyncHistory(accountId);

            const response = history.map(sync => ({
                deviceInfo: {
                    deviceId: sync.user_devices?.device_id,
                    deviceName: sync.user_devices?.device_name,
                    deviceUuid: sync.user_devices?.device_uuid
                },
                syncType: sync.sync_type,
                syncStatus: sync.sync_status,
                lastSyncedAt: sync.last_synced_at,
                ipAddress: sync.ip_address
            }));

            res.json(response);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Admin: Lấy lịch sử đồng bộ của một người dùng cụ thể
     */
    getUserSyncHistory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const requester = req.user;
            if (!requester) {
                throwError(ErrorCodes.UNAUTHORIZED, 'Requester not authenticated');
            } else if (requester.role !== 'ADMIN') {
                throwError(ErrorCodes.FORBIDDEN, 'Only admins can view other users\' sync history');
            }

            const accountId = req.params.userId;
            const history = await this.syncTrackingService.getSyncHistoryByUserId(accountId);

            const response = history.map(sync => ({
                deviceInfo: {
                    deviceId: sync.user_devices?.device_id,
                    deviceName: sync.user_devices?.device_name,
                    deviceUuid: sync.user_devices?.device_uuid
                },
                syncType: sync.sync_type,
                syncStatus: sync.sync_status,
                lastSyncedAt: sync.last_synced_at,
                ipAddress: sync.ip_address
            }));

            res.json(response);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Admin: Lấy toàn bộ lịch sử đồng bộ của một người dùng
     */
    getFullUserSyncHistory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const requester = req.user;
            if (!requester) {
                throwError(ErrorCodes.UNAUTHORIZED, 'Requester not authenticated');
            } else if (requester.role !== 'ADMIN') {
                throwError(ErrorCodes.FORBIDDEN, 'Only admins can view full sync history');
            }

            const accountId = req.params.userId;
            const history = await this.syncTrackingService.getFullSyncHistory(accountId);

            const response = history.map(sync => ({
                deviceInfo: {
                    deviceId: sync.user_devices?.device_id,
                    deviceName: sync.user_devices?.device_name,
                    deviceUuid: sync.user_devices?.device_uuid
                },
                syncType: sync.sync_type,
                syncStatus: sync.sync_status,
                lastSyncedAt: sync.last_synced_at,
                ipAddress: sync.ip_address,
                isDeleted: sync.is_deleted
            }));

            res.json(response);
        } catch (error) {
            next(error);
        }
    };
}
