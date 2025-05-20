import { Request, Response, NextFunction } from 'express';
import SpaceService from '../services/space.service';
import { ErrorCodes, throwError } from '../utils/errors';
import {GroupRole} from "../types/group";

class SpaceController {
    private spaceService: SpaceService;

    constructor() {
        this.spaceService = new SpaceService();
    }

    /**
     * Tạo không gian mới
     * @param req Request Express với thông tin không gian trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    createSpace = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can create spaces');
        }

        try {
            const space = await this.spaceService.createSpace(req.body);
            res.status(201).json(space);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách không gian theo nhà
     * @param req Request Express với ID nhà trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getSpacesByHouse = async (req: Request, res: Response, next: NextFunction) => {
        const { houseId } = req.params;

        try {
            const spaces = await this.spaceService.getSpacesByHouse(parseInt(houseId));
            res.json(spaces);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thông tin không gian theo ID
     * @param req Request Express với ID không gian trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getSpaceById = async (req: Request, res: Response, next: NextFunction) => {
        const { spaceId } = req.params;

        try {
            const space = await this.spaceService.getSpaceById(parseInt(spaceId));
            res.json(space);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật thông tin không gian
     * @param req Request Express với ID không gian trong params và tên không gian trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateSpace = async (req: Request, res: Response, next: NextFunction) => {
        const { spaceId } = req.params;
        const { space_name } = req.body;
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can update spaces');
        }

        try {
            const space = await this.spaceService.updateSpace(parseInt(spaceId), space_name);
            res.json(space);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xóa không gian
     * @param req Request Express với ID không gian trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    deleteSpace = async (req: Request, res: Response, next: NextFunction) => {
        const { spaceId } = req.params;
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can delete spaces');
        }

        try {
            await this.spaceService.deleteSpace(parseInt(spaceId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy tên không gian
     * @param req Request Express với ID không gian trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getSpaceName = async (req: Request, res: Response, next: NextFunction) => {
        const { spaceId } = req.params;

        try {
            const name = await this.spaceService.getSpaceName(parseInt(spaceId));
            res.json({ success: true, name });
        } catch (error) {
            next(error);
        }
    };
}

export default SpaceController;

