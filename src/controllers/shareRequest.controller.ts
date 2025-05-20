import { Request, Response, NextFunction } from 'express';
import ShareRequestService from '../services/shareRequest.service';
import { ErrorCodes, throwError } from '../utils/errors';
import {GroupRole} from "../types/group";

class ShareRequestController {
    private shareRequestService: ShareRequestService;

    constructor() {
        this.shareRequestService = new ShareRequestService();
    }

    /**
     * Khởi tạo yêu cầu chia sẻ thiết bị
     * @param req Request Express với thông tin thiết bị và người nhận trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    initiateShareRequest = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can initiate share requests');
        }

        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { device_serial, to_user_email, permission_type } = req.body;
            const groupId = parseInt(req.params.groupId);
            await this.shareRequestService.initiateShareRequest({
                device_serial,
                to_user_email,
                permission_type,
                from_user_id: accountId,
                groupId,
                requesterRole: req.groupRole as GroupRole,
            });
            res.status(201).json({ message: 'Share request initiated' });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Phê duyệt hoặc từ chối yêu cầu chia sẻ
     * @param req Request Express với ID yêu cầu trong params và trạng thái chấp nhận trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    approveShareRequest = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { requestId } = req.params;
            const { accept } = req.body;
            await this.shareRequestService.approveShareRequest(parseInt(requestId), accept, accountId);
            res.json({ message: accept ? 'Share request approved' : 'Share request rejected' });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách yêu cầu chia sẻ theo thiết bị
     * @param req Request Express với ID thiết bị, số seri và ID nhóm trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getShareRequestsByDevice = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { deviceId, serial_number, groupId } = req.params;
            if (!serial_number) throwError(ErrorCodes.BAD_REQUEST, 'Serial number is required');
            const requests = await this.shareRequestService.getShareRequestsByDevice(parseInt(deviceId), serial_number, parseInt(groupId));
            res.json(requests);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách quyền chia sẻ theo thiết bị
     * @param req Request Express với ID thiết bị, số seri và ID nhóm trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getSharedPermissionsByDevice = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { deviceId, serial_number, groupId } = req.params;
            if (!serial_number) throwError(ErrorCodes.BAD_REQUEST, 'Serial number is required');
            const permissions = await this.shareRequestService.getSharedPermissionsByDevice(parseInt(deviceId), serial_number, parseInt(groupId));
            res.json(permissions);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách thiết bị được chia sẻ bởi chủ sở hữu
     * @param req Request Express
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getSharedDevicesByOwner = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const permissions = await this.shareRequestService.getSharedDevicesByOwner(accountId);
            res.json(permissions);
        } catch (error) {
            next(error);
        }
    };
}

export default ShareRequestController;

