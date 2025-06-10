import { Request, Response, NextFunction } from 'express';
import GroupService from '../services/group.service';
import { ErrorCodes, throwError } from '../utils/errors';
import { GroupRole } from "../types/group";

class GroupController {
    private groupService: GroupService;

    constructor() {
        this.groupService = new GroupService();
    }

    /**
     * Tạo nhóm mới với các thông tin bổ sung
     * @param req Request Express với thông tin nhóm trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    createGroup = async (req: Request, res: Response, next: NextFunction) => {
        const { group_name, icon_name, icon_color, group_description } = req.body;
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const group = await this.groupService.createGroup(
                group_name,
                accountId,
                icon_name,
                icon_color,
                group_description
            );
            res.status(201).json(group);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy thông tin nhóm theo ID
     */
    getGroup = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId } = req.params;
        try {
            const group = await this.groupService.getGroup(parseInt(groupId));
            res.json(group);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật thông tin nhóm
     * @param req Request Express với ID nhóm trong params và thông tin cập nhật trong body
     * @param res Response Express
     * @param next Middleware tiếp theo
     */
    updateGroup = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId } = req.params;
        const { group_name, icon_name, icon_color, group_description } = req.body;

        if (!req.groupRole || req.groupRole !== GroupRole.OWNER) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner can update group information');
        }

        try {
            const group = await this.groupService.updateGroup(parseInt(groupId), {
                group_name,
                icon_name,
                icon_color,
                group_description
            });
            res.json(group);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xóa nhóm
     */
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

    /**
     * Thêm người dùng vào nhóm
     */
    addUserToGroup = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId, accountId, role } = req.body;

        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can add users');
        }

        // VICE không thể thêm người dùng với role OWNER
        if (req.groupRole === GroupRole.VICE && role === GroupRole.OWNER) {
            throwError(ErrorCodes.FORBIDDEN, 'Vice cannot assign owner role');
        }

        try {
            const userGroup = await this.groupService.addUserToGroup(groupId, accountId, role);
            res.status(201).json(userGroup);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Cập nhật vai trò của người dùng trong nhóm
     */
    updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId } = req.params;
        const { accountId, role } = req.body;

        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can update roles');
        }

        // Kiểm tra nếu người dùng VICE không thể thay đổi role của OWNER
        if (req.groupRole === GroupRole.VICE) {
            const targetUserRole = await this.groupService.getUserRole(parseInt(groupId), accountId);
            if (targetUserRole === GroupRole.OWNER) {
                throwError(ErrorCodes.FORBIDDEN, 'Vice cannot modify owner\'s role');
            }
        }

        try {
            const userGroup = await this.groupService.updateUserRole(parseInt(groupId), accountId, role);
            res.json(userGroup);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Xóa người dùng khỏi nhóm
     */
    removeUserFromGroup = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId } = req.params;
        const { accountId } = req.body;

        if (!req.groupRole || ![GroupRole.OWNER, GroupRole.VICE].includes(req.groupRole)) {
            throwError(ErrorCodes.FORBIDDEN, 'Only owner or vice can remove users');
        }

        // Kiểm tra nếu người dùng VICE không thể xóa OWNER
        if (req.groupRole === GroupRole.VICE) {
            const targetUserRole = await this.groupService.getUserRole(parseInt(groupId), accountId);
            if (targetUserRole === GroupRole.OWNER) {
                throwError(ErrorCodes.FORBIDDEN, 'Vice cannot remove owner from group');
            }
        }

        try {
            await this.groupService.removeUserFromGroup(parseInt(groupId), accountId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách nhóm của người dùng hiện tại
     */
    getGroupsByUsername = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const username = req.user?.username;
            if (!username) {
                throwError(ErrorCodes.UNAUTHORIZED, 'Unauthorized access');
            }

            const userId = req.user?.userId;
            if (!userId) {
                throwError(ErrorCodes.BAD_REQUEST, 'Valid user ID is required');
            }

            const groups = await this.groupService.getGroupsByUsername(username!, userId);
            res.json({
                success: true,
                data: groups
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lấy danh sách thành viên trong nhóm
     */
    getUsersInGroup = async (req: Request, res: Response, next: NextFunction) => {
        const { groupId } = req.params;
        try {
            const users = await this.groupService.getUsersInGroup(parseInt(groupId));
            res.json({
                success: true,
                data: users
            });
        } catch (error) {
            next(error);
        }
    };
}

export default GroupController;
