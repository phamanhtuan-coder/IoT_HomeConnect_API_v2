import { Request, Response, NextFunction } from 'express';
import HouseService from '../services/house.service';
import { ErrorCodes, throwError } from '../utils/errors';
import {GroupRole} from "../types/group";

class HouseController {
    private houseService: HouseService;

    constructor() {
        this.houseService = new HouseService();
    }

    /**
     * Tạo nhà mới
     * @param req Request Express với thông tin nhà trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    createHouse = async (req: Request, res: Response, next: NextFunction) => {
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can create houses');
        }

        try {
            const house = await this.houseService.createHouse(req.body);
            res.status(201).json(house);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách nhà theo nhóm
     * @param req Request Express với ID nhóm trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getHousesByGroup = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId } = req.params;

        try {
            const houses = await this.houseService.getHousesByGroup(parseInt(groupId));
            res.json(houses);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thông tin nhà theo ID
     * @param req Request Express với ID nhà trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    getHouseById = async (req: Request, res: Response, next: NextFunction) => {
        const { houseId } = req.params;

        try {
            const house = await this.houseService.getHouseById(parseInt(houseId));
            res.json(house);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật thông tin nhà
     * @param req Request Express với ID nhà trong params và thông tin cập nhật trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateHouse = async (req: Request, res: Response, next: NextFunction) => {
        const { houseId } = req.params;
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can update houses');
        }

        try {
            const house = await this.houseService.updateHouse(parseInt(houseId), req.body);
            res.json(house);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xóa nhà
     * @param req Request Express với ID nhà trong params
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    deleteHouse = async (req: Request, res: Response, next: NextFunction) => {
        const { houseId } = req.params;
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can delete houses');
        }

        try {
            await this.houseService.deleteHouse(parseInt(houseId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

export default HouseController;

