import { Request, Response, NextFunction } from 'express';
import SpaceService from '../services/space.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { GroupRole } from '../types/auth';

class SpaceController {
    private spaceService: SpaceService;

    constructor() {
        this.spaceService = new SpaceService();
    }

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

    getSpacesByHouse = async (req: Request, res: Response, next: NextFunction) => {
        const { houseId } = req.params;

        try {
            const spaces = await this.spaceService.getSpacesByHouse(parseInt(houseId));
            res.json(spaces);
        } catch (error) {
            next(error);
        }
    };

    getSpaceById = async (req: Request, res: Response, next: NextFunction) => {
        const { spaceId } = req.params;

        try {
            const space = await this.spaceService.getSpaceById(parseInt(spaceId));
            res.json(space);
        } catch (error) {
            next(error);
        }
    };

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