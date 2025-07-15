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

    getDeviceSharedForCustomer = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const accountId = req.user?.userId || req.user?.employeeId;
            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Không tìm thấy tài khoản');

            const { search } = req.query as { search: string };

            const result = await this.sharedPermissionService.getDeviceSharedForCustomer(accountId as string, search);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    getSharedUsersBySerialNumber = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const accountId = req.user?.userId || req.user?.employeeId;
            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Không tìm thấy tài khoản');

            const { serialNumber } = req.params;
            const result = await this.sharedPermissionService.getSharedUsersBySerialNumber(serialNumber);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Approve or reject share permission request
     * @param req Request Express với ticketId, recipientId và isApproved trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    approveSharePermission = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const accountId = req.user?.userId || req.user?.employeeId;
            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Không tìm thấy tài khoản');

            const { ticketId, isApproved } = req.body;
            if (!ticketId || typeof isApproved !== 'boolean') {
                throwError(ErrorCodes.BAD_REQUEST, 'ticketId và isApproved là bắt buộc');
            }

            const result = await this.sharedPermissionService.approveSharePermission(ticketId, accountId, isApproved);
            res.status(200).json(result);
        } catch (error) {
            console.log(error);
            next(error);
        }
    };
}

export default SharedPermissionController;

