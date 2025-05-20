import { Request, Response, NextFunction } from 'express';
import SharedPermissionService from '../services/sharedPermission.service';
import { ErrorCodes, throwError } from '../utils/errors';
import {GroupRole} from "../types/group";

class SharedPermissionController {
    private sharedPermissionService: SharedPermissionService;

    constructor() {
        this.sharedPermissionService = new SharedPermissionService();
    }

    /**
     * Thu hồi quyền chia sẻ thiết bị
     * @param req Request Express với ID quyền trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    revokeShareDevice = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can revoke sharing');
        }

        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { permissionId } = req.params;
            await this.sharedPermissionService.revokeShareDevice(parseInt(permissionId), accountId, req.groupRole as GroupRole);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    /**
     * Người nhận tự thu hồi quyền chia sẻ
     * @param req Request Express với ID quyền trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    revokeShareByRecipient = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { permissionId } = req.params;
            await this.sharedPermissionService.revokeShareByRecipient(parseInt(permissionId), accountId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

export default SharedPermissionController;

