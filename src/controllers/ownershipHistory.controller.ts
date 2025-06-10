import { Request, Response, NextFunction } from 'express';
import OwnershipHistoryService from '../services/ownershipHistory.service';
import {ErrorCodes, throwError} from '../utils/errors';
import {ApproveOwnershipTransferInput, OwnershipTransferInput} from "../utils/schemas/sharing.schema";

class OwnershipHistoryController {
    private ownershipHistoryService: OwnershipHistoryService;

    constructor() {
        this.ownershipHistoryService = new OwnershipHistoryService();
    }

    /**
     * Khởi tạo yêu cầu chuyển quyền sở hữu thiết bị
     * @param req Request Express với thông tin thiết bị và người nhận trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
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

    /**
     * Phê duyệt hoặc từ chối yêu cầu chuyển quyền sở hữu
     * @param req Request Express với ID phiếu yêu cầu trong params và trạng thái chấp nhận trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    async approveOwnershipTransfer(req: Request, res: Response, next: NextFunction) {
        try {
            const { ticketId } = req.params;
            const { accept } = req.body as ApproveOwnershipTransferInput;
            const userId = req.user?.userId || req.user?.employeeId;
            if (!userId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

            await this.ownershipHistoryService.approveOwnershipTransfer(ticketId, accept, userId);

            res.status(200).json({ message: accept ? 'Ownership transfer approved' : 'Ownership transfer rejected' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy thông tin lịch sử quyền sở hữu theo ID
     * @param req Request Express với ID lịch sử trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    async getOwnershipHistoryById(req: Request, res: Response, next: NextFunction) {
        try {
            const { historyId } = req.params;
            const history = await this.ownershipHistoryService.getOwnershipHistoryById(parseInt(historyId));
            res.status(200).json(history);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy lịch sử quyền sở hữu theo số seri thiết bị
     * @param req Request Express với số seri thiết bị trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    async getOwnershipHistoryByDevice(req: Request, res: Response, next: NextFunction) {
        try {
            const { device_serial } = req.params;
            const histories = await this.ownershipHistoryService.getOwnershipHistoryByDevice(device_serial);
            res.status(200).json(histories);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy lịch sử quyền sở hữu của người dùng hiện tại
     * @param req Request Express
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
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

    /**
     * Xóa lịch sử quyền sở hữu
     * @param req Request Express với ID lịch sử trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
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

