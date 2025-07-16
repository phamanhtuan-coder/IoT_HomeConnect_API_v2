import { Request, Response } from 'express';
import DeviceLinksService, { DeviceLinkInput, DeviceLinkUpdate, PREDEFINED_OUTPUT_VALUES } from '../services/device-links.service';
import { throwError, ErrorCodes } from '../utils/errors';

class DeviceLinksController {
    private deviceLinksService: DeviceLinksService;

    constructor() {
        this.deviceLinksService = new DeviceLinksService();
    }

    /**
     * Tạo liên kết mới giữa các thiết bị
     */
    async createDeviceLink(req: Request, res: Response): Promise<void> {
        try {
            const { input_device_id, output_device_id, component_id, value_active, logic_operator, output_action, output_value } = req.body;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, "Authentication required");
            }

            if (!input_device_id || !output_device_id || !component_id || !value_active) {
                throwError(ErrorCodes.BAD_REQUEST, "input_device_id, output_device_id, component_id, and value_active are required");
            }

            const linkInput: DeviceLinkInput = {
                input_device_id,
                output_device_id,
                component_id,
                value_active: String(value_active),
                logic_operator: logic_operator || 'AND',
                output_action: output_action || 'turn_on',
                output_value: output_value || '' // Thêm output_value
            };

            const deviceLink = await this.deviceLinksService.createDeviceLink(linkInput, accountId);

            res.status(201).json({
                success: true,
                message: "Device link created successfully",
                data: deviceLink
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal server error",
                error: error.code || "UNKNOWN_ERROR"
            });
        }
    }

    /**
     * Lấy tất cả device links của user
     */
    async getDeviceLinks(req: Request, res: Response): Promise<void> {
        try {
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, "Yêu cầu đăng nhập");
            }

            const links = await this.deviceLinksService.getDeviceLinksByAccount(accountId);

            res.status(200).json({
                success: true,
                message: "Lấy danh sách liên kết thành công",
                data: links
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Lỗi server",
                error: error.code || "UNKNOWN_ERROR"
            });
        }
    }

    /**
     * Lấy device links theo output device
     */
    async getLinksByOutputDevice(req: Request, res: Response): Promise<void> {
        try {
            const { outputDeviceId } = req.params;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, "Yêu cầu đăng nhập");
            }

            if (!outputDeviceId) {
                throwError(ErrorCodes.BAD_REQUEST, "ID thiết bị output là bắt buộc");
            }

            const links = await this.deviceLinksService.getLinksByOutputDevice(outputDeviceId);

            res.status(200).json({
                success: true,
                message: "Lấy danh sách liên kết thành công",
                data: links
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Lỗi server",
                error: error.code || "UNKNOWN_ERROR"
            });
        }
    }

    /**
     * Cập nhật device link
     */
    async updateDeviceLink(req: Request, res: Response): Promise<void> {
        try {
            const { linkId } = req.params;
            const { value_active, logic_operator, component_id, output_action, output_value } = req.body;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, "Yêu cầu đăng nhập");
            }

            if (!linkId) {
                throwError(ErrorCodes.BAD_REQUEST, "ID liên kết là bắt buộc");
            }

            const linkUpdate: DeviceLinkUpdate = {};
            if (value_active !== undefined) linkUpdate.value_active = String(value_active);
            if (logic_operator !== undefined) linkUpdate.logic_operator = logic_operator;
            if (component_id !== undefined) linkUpdate.component_id = component_id;
            if (output_action !== undefined) linkUpdate.output_action = output_action;
            if (output_value !== undefined) linkUpdate.output_value = output_value; // Thêm output_value

            const updatedLink = await this.deviceLinksService.updateDeviceLink(
                parseInt(linkId), 
                linkUpdate, 
                accountId
            );

            res.status(200).json({
                success: true,
                message: "Cập nhật liên kết thành công",
                data: updatedLink
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Lỗi server",
                error: error.code || "UNKNOWN_ERROR"
            });
        }
    }

    /**
     * Xóa device link
     */
    async deleteDeviceLink(req: Request, res: Response): Promise<void> {
        try {
            const { linkId } = req.params;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, "Yêu cầu đăng nhập");
            }

            if (!linkId) {
                throwError(ErrorCodes.BAD_REQUEST, "ID liên kết là bắt buộc");
            }

            await this.deviceLinksService.deleteDeviceLink(parseInt(linkId), accountId);

            res.status(200).json({
                success: true,
                message: "Xóa liên kết thành công"
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Lỗi server",
                error: error.code || "UNKNOWN_ERROR"
            });
        }
    }

    /**
     * Test device link trigger manually
     */
    async testDeviceLink(req: Request, res: Response): Promise<void> {
        try {
            const { linkId } = req.params;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, "Yêu cầu đăng nhập");
            }

            if (!linkId) {
                throwError(ErrorCodes.BAD_REQUEST, "ID liên kết là bắt buộc");
            }

            // Get device link
            const links = await this.deviceLinksService.getDeviceLinksByAccount(accountId);
            const link = links.find(l => l.id === parseInt(linkId));

            if (!link) {
                throwError(ErrorCodes.NOT_FOUND, "Liên kết thiết bị không tồn tại");
            }

            // Trigger manually by processing the current value
            await this.deviceLinksService.processDeviceLinks(
                link!.input_device_id, 
                link!.input_device?.current_value
            );

            res.status(200).json({
                success: true,
                message: "Kích hoạt liên kết thành công"
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Lỗi server",
                error: error.code || "UNKNOWN_ERROR"
            });
        }
    }

    /**
     * Lấy predefined output values
     */
    async getPredefinedOutputValues(req: Request, res: Response): Promise<void> {
        try {
            res.status(200).json({
                success: true,
                message: "Lấy danh sách giá trị output thành công",
                data: PREDEFINED_OUTPUT_VALUES
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Lỗi server",
                error: error.code || "UNKNOWN_ERROR"
            });
        }
    }
}

export default DeviceLinksController; 