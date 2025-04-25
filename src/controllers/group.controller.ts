import { Request, Response, NextFunction } from 'express';
import GroupService from '../services/group.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { GroupRole } from '../types/auth';

class GroupController {
    private groupService: GroupService;

    constructor() {
        this.groupService = new GroupService();
    }

    createGroup = async (req: Request, res: Response, next: NextFunction) => {
        const { group_name } = req.body;
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const group = await this.groupService.createGroup(group_name, accountId);
            res.status(201).json(group);
        } catch (error) {
            next(error);
        }
    };

    getGroup = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId } = req.params;
        try {
            const group = await this.groupService.getGroup(parseInt(groupId));
            res.json(group);
        } catch (error) {
            next(error);
        }
    };

    updateGroupName = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId } = req.params;
        const { group_name } = req.body;
        if (!req.groupRole || req.groupRole !== GroupRole.OWNER) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner can update group name');
        }

        try {
            const group = await this.groupService.updateGroupName(parseInt(groupId), group_name);
            res.json(group);
        } catch (error) {
            next(error);
        }
    };

    deleteGroup = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId } = req.params;
        if (!req.groupRole || req.groupRole !== GroupRole.OWNER) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner can delete group');
        }

        try {
            await this.groupService.deleteGroup(parseInt(groupId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    addUserToGroup = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId, accountId, role } = req.body;
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can add users');
        }

        try {
            const userGroup = await this.groupService.addUserToGroup(groupId, accountId, role);
            res.status(201).json(userGroup);
        } catch (error) {
            next(error);
        }
    };

    updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId } = req.params;
        const { accountId, role } = req.body;
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can update roles');
        }

        try {
            const userGroup = await this.groupService.updateUserRole(parseInt(groupId), accountId, role);
            res.json(userGroup);
        } catch (error) {
            next(error);
        }
    };

    removeUserFromGroup = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId } = req.params;
        const { accountId } = req.body;
        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can remove users');
        }

        try {
            await this.groupService.removeUserFromGroup(parseInt(groupId), accountId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}

export default GroupController;