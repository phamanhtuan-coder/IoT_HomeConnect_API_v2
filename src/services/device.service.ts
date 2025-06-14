import {Prisma, PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";
import { Server } from "socket.io";
import  AlertService  from "../services/alert.service";
import {Device, DeviceAttributes} from "../types/device";
import {GroupRole} from "../types/group";
import {PermissionType} from "../types/share-request";
import {generateComponentId, generateDeviceId} from "../utils/helpers";
import {DeviceState, StateUpdateInput} from "../types/device-state"; // Import AlertService

let io: Server | null = null;
const alertService = new AlertService(); // Instantiate AlertService

export function setSocketInstance(socket: Server) {
    io = socket;
}

class DeviceService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createDevice(input: {
        templateId: string;
        serial_number: string;
        spaceId?: number;
        groupId?: number;
        accountId: string;
        name: string;
        attribute?: Record<string, any>;
        wifi_ssid?: string;
        wifi_password?: string;
    }): Promise<Device>
    {
        const { templateId, serial_number, spaceId, groupId, accountId, name, attribute, wifi_ssid, wifi_password } = input;

        const template = await this.prisma.device_templates.findFirst({
            where: { template_id: templateId, is_deleted: false },
        });
        if (!template) throwError(ErrorCodes.NOT_FOUND, "Device template not found");

        // Kiểm tra space và lấy group từ house nếu có spaceId
        let finalGroupId = groupId;
        if (spaceId) {
            const space = await this.prisma.spaces.findFirst({
                where: { space_id: spaceId, is_deleted: false },
                include: {
                    houses: {
                        select: {
                            group_id: true
                        }
                    }
                }
            });
            if (!space) throwError(ErrorCodes.NOT_FOUND, "Space not found");
            if (!groupId && space?.houses?.group_id) {
                finalGroupId = space?.houses.group_id;
            }
        }

        // Kiểm tra group nếu có
        if (finalGroupId) {
            const group = await this.prisma.groups.findFirst({
                where: { group_id: finalGroupId, is_deleted: false }
            });
            if (!group) throwError(ErrorCodes.NOT_FOUND, "Group not found");
        }

        const existingDevice = await this.prisma.devices.findFirst({
            where: { serial_number },
        });
        if (existingDevice) throwError(ErrorCodes.CONFLICT, "Serial number already exists");

        let device_id: string;
        let attempts = 0;
        const maxAttempts = 5;
        do {
            device_id = generateDeviceId()
            const idExists = await this.prisma.devices.findFirst({ where: { device_id: device_id } });
            if (!idExists) break;
            attempts++;
            if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique ID');
        } while (true);

        const device = await this.prisma.devices.create({
            data: {
                device_id: device_id,
                serial_number,
                template_id: templateId,
                space_id: spaceId,
                group_id: finalGroupId,
                account_id: accountId,
                name,
                power_status: false,
                attribute,
                wifi_ssid,
                wifi_password,
                link_status: "unlinked",
            },
        });

        return this.mapPrismaDeviceToAuthDevice(device);
    }

    async linkDevice(serial_number: string, spaceId: number | null, accountId: string, name: string): Promise<Device> {
        const device = await this.prisma.devices.findUnique({
            where: { serial_number, is_deleted: false },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        if (spaceId) {
            const space = await this.prisma.spaces.findUnique({
                where: { space_id: spaceId, is_deleted: false },
            });
            if (!space) throwError(ErrorCodes.NOT_FOUND, "Space not found");
        }

        const updatedDevice = await this.prisma.devices.update({
            where: { serial_number },
            data: { account_id: accountId, space_id: spaceId, name, link_status: "linked", updated_at: new Date() },
        });

        if (io) {
            io.of("/device").to(`device:${serial_number}`).emit("device_online", { deviceId: serial_number });
        }

        return this.mapPrismaDeviceToAuthDevice(updatedDevice);
    }

    async getDevicesByAccount(accountId: string): Promise<Device[]> {
        const devices = await this.prisma.devices.findMany({
            where: { account_id: accountId, is_deleted: false },
            include: { device_templates: true, spaces: { include: { houses: true } } },
        });

        return devices.map((device) => this.mapPrismaDeviceToAuthDevice(device));
    }

    async getDevicesByGroup(groupId: number): Promise<Device[]> {
        const devices = await this.prisma.devices.findMany({
            where: {
                is_deleted: false,
                OR: [
                    { group_id: groupId },
                    { spaces: { houses: { group_id: groupId, is_deleted: false }, is_deleted: false } },
                ],
            },
            include: { device_templates: true, spaces: { include: { houses: true } } },
        });

        return devices.map((device) => this.mapPrismaDeviceToAuthDevice(device));
    }

    async getDevicesByHouse(houseId: number): Promise<Device[]> {
        const devices = await this.prisma.devices.findMany({
            where: {
                is_deleted: false,
                spaces: { house_id: houseId, is_deleted: false },
            },
            include: { device_templates: true, spaces: true },
        });

        return devices.map((device) => this.mapPrismaDeviceToAuthDevice(device));
    }

    async getDevicesBySpace(spaceId: number): Promise<Device[]> {
        const devices = await this.prisma.devices.findMany({
            where: { space_id: spaceId, is_deleted: false },
            include: { device_templates: true },
        });

        return devices.map((device) => this.mapPrismaDeviceToAuthDevice(device));
    }

    async getDeviceById(deviceId: string, serial_number: string, accountId: string): Promise<Device & { capabilities?: any }> {
        const device = await this.prisma.devices.findFirst({
            where: { device_id: deviceId, serial_number: serial_number, is_deleted: false },
            include: {
                device_templates: true,
                spaces: true,
                firmware: true  // Add this include
            },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        await this.checkDevicePermission(deviceId, serial_number, accountId, false);

        const mappedDevice = this.mapPrismaDeviceToAuthDevice(device);

        // Add capabilities to response
        try {
            const capabilities = await this.getDeviceCapabilities(deviceId, serial_number);
            return { ...mappedDevice, capabilities };
        } catch (error) {
            console.warn(`Could not fetch capabilities for device ${deviceId}:`, error);
            return mappedDevice;
        }
    }

    async unlinkDevice(deviceId: string, serial_number: string, accountId: string): Promise<void> {
      const device = await this.prisma.devices.findFirst({
          where: { device_id: deviceId, serial_number: serial_number, account_id: accountId, is_deleted: false },
      });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị hoặc không có quyền truy cập");

        await this.prisma.devices.update({
            where: { device_id_serial_number: { device_id: deviceId, serial_number } },
            data: {
                account_id: null,
                space_id: null,
                link_status: "unlinked",
                runtime_capabilities: Prisma.JsonNull,
                updated_at: new Date()
            },
        });

        // Create an alert for device.ts unlink
        await alertService.createAlert(
            // @ts-ignore
             device,
            3, // Assume alert_type_id 3 for device.ts unlink (adjust based on your alert_types table)
            `Device ${serial_number} has been unlinked`
        );

        if (io) {
            io.of("/device").to(`device:${serial_number}`).emit("device_disconnect", { deviceId: serial_number });
        }
    }

    async updateDeviceSpace(deviceId: string, serial_number: string, spaceId: number | null, accountId: string): Promise<Device> {
      const device = await this.prisma.devices.findFirst({
          where: { device_id: deviceId, serial_number: serial_number, account_id: accountId, is_deleted: false },
      });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị or access denied");

        if (spaceId) {
            const space = await this.prisma.spaces.findFirst({
                where: { space_id: spaceId, is_deleted: false },
            });
            if (!space) throwError(ErrorCodes.NOT_FOUND, "Space not found");
        }

        const updatedDevice = await this.prisma.devices.update({
            where: { device_id_serial_number: { device_id: deviceId, serial_number } },
            data: { space_id: spaceId, updated_at: new Date() },
        });

        return this.mapPrismaDeviceToAuthDevice(updatedDevice);
    }

    async checkDevicePermission(deviceId: string, serial_number: string, accountId: string, requireControl: boolean): Promise<void> {
        const device = await this.prisma.devices.findFirst({
            where: { device_id: deviceId, serial_number, is_deleted: false },
            include: { spaces: { include: { houses: true } } },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        if (device?.account_id === accountId) return;

        const groupId = device?.group_id || device?.spaces?.houses?.group_id;
        if (groupId) {
            const userGroup = await this.prisma.user_groups.findFirst({
                where: {
                    group_id: groupId,
                    account_id: accountId,
                    is_deleted: false,
                },
            });
            if (userGroup && userGroup.role) {
                const role = userGroup.role as GroupRole;
                if (!requireControl || [GroupRole.OWNER, GroupRole.VICE, GroupRole.ADMIN].includes(role)) {
                    return;
                }
            }
        }

        const sharedPermission = await this.prisma.shared_permissions.findFirst({
            where: {
                device_serial: device?.serial_number,
                shared_with_user_id: accountId,
                is_deleted: false,
            },
        });
        if (sharedPermission) {
            if (requireControl && sharedPermission.permission_type !== PermissionType.CONTROL) { // Fixed: use requireControl instead of requireWriteAccess
                throwError(ErrorCodes.FORBIDDEN, "Control permission required for this operation");
            }
            return;
        }

        throwError(ErrorCodes.FORBIDDEN, "No permission to access this device");
    }

    async removeViceDevicesFromGroup(groupId: number, accountId: string): Promise<void> {
        const userGroup = await this.prisma.user_groups.findFirst({
            where: { group_id: groupId, account_id: accountId, is_deleted: false },
        });
        if (!userGroup || userGroup.role !== GroupRole.VICE) return;

        const devices = await this.prisma.devices.findMany({
            where: {
                account_id: accountId,
                OR: [
                    { group_id: groupId },
                    { spaces: { houses: { group_id: groupId, is_deleted: false }, is_deleted: false } },
                ],
                is_deleted: false,
            },
        });

        await this.prisma.devices.updateMany({
            where: {
                account_id: accountId,
                OR: [
                    { group_id: groupId },
                    { spaces: { houses: { group_id: groupId, is_deleted: false }, is_deleted: false } },
                ],
                is_deleted: false,
            },
            data: { account_id: null, space_id: null, link_status: "unlinked", updated_at: new Date() },
        });

        // Create alerts for each unlinked device.ts
        for (const device of devices) {
            await alertService.createAlert(
                // @ts-ignore
                device,
                3, // Assume alert_type_id 3 for device.ts unlink
                `Device ${device!.serial_number} has been unlinked from group`
            );
        }

        if (io) {
            devices.forEach((device) => {
                io!.of("/device.ts")
                    .to(`device:${device!.serial_number}`)
                    .emit("device_disconnect", { deviceId: device!.serial_number });
            });
        }
    }

    /**
     * Get device capabilities by merging base and runtime capabilities
     */
    async getDeviceCapabilities(deviceId: string, serial_number: string): Promise<any> {
        const device = await this.prisma.devices.findFirst({
            where: { device_id: deviceId, serial_number, is_deleted: false },
            include: {
                device_templates: true,
                firmware: true
            },
        });

        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        // Merge base + runtime capabilities
        const baseCapabilities = device?.device_templates?.base_capabilities || {};
        const runtimeCapabilities = device?.runtime_capabilities || {};

        return {
            base: baseCapabilities,
            runtime: runtimeCapabilities,
            firmware_version: device?.firmware?.version || null,
            firmware_id: device?.firmware_id,
            merged_capabilities: this.mergeCapabilities(baseCapabilities, runtimeCapabilities)
        };
    }

    /**
     * Update device runtime capabilities
     */
    async updateDeviceCapabilities(
        deviceId: string,
        serial_number: string,
        capabilities: any
    ): Promise<void> {
        const device = await this.prisma.devices.findFirst({
            where: { device_id: deviceId, serial_number, is_deleted: false },
        });

        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        await this.prisma.devices.update({
            where: { device_id_serial_number: { device_id: deviceId, serial_number } },
            data: {
                runtime_capabilities: capabilities,
                updated_at: new Date()
            },
        });

        // Broadcast capabilities update via Socket.IO
        if (io) {
            io.of("/device").to(`device:${serial_number}`).emit("capabilities_updated", {
                deviceId: serial_number,
                capabilities,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Unified device state update method
     */
    async updateDeviceState(
        deviceId: string,
        serial_number: string,
        stateUpdate: StateUpdateInput,
        accountId: string
    ): Promise<Device> {

        await this.checkDevicePermission(deviceId, serial_number, accountId, true);

        // Get current device state
        const device = await this.prisma.devices.findFirst({
            where: { device_id: deviceId, serial_number, is_deleted: false },
            include: { device_templates: true, firmware: true }
        });

        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        // Validate state update against capabilities
        const capabilities = await this.getDeviceCapabilities(deviceId, serial_number);
        this.validateStateUpdate(stateUpdate, capabilities);

        // Merge current state with updates
        const currentState = (device?.attribute as DeviceState) || {};
        const newState: DeviceState = {
            ...currentState,
            ...stateUpdate,
            // Always ensure power_status exists
            power_status: stateUpdate.power_status !== undefined ? stateUpdate.power_status : (currentState.power_status || false)
        };

        // Update database - store in attribute field
        const updatedDevice = await this.prisma.devices.update({
            where: { device_id_serial_number: { device_id: deviceId, serial_number } },
            data: {
                attribute: newState,
                power_status: newState.power_status, // Keep for backward compatibility
                // Update wifi fields if provided
                ...(stateUpdate.wifi_ssid && { wifi_ssid: stateUpdate.wifi_ssid }),
                ...(stateUpdate.wifi_password && { wifi_password: stateUpdate.wifi_password }),
                updated_at: new Date()
            },
        });

        // Send unified command to IoT device
        if (io) {
            io.of("/device").to(`device:${serial_number}`).emit("command", {
                action: "updateState",
                state: stateUpdate,
                timestamp: new Date().toISOString()
            });
        }

        // Send status update to clients for real-time sync
        if (io) {
            io.of("/device").to(`device:${serial_number}`).emit("deviceStatus", {
                deviceId: serial_number,
                state: newState,
                timestamp: new Date().toISOString()
            });
        }

        return this.mapPrismaDeviceToAuthDevice(updatedDevice);
    }

    /**
     * Get current device state
     */
    async getDeviceState(deviceId: string, serial_number: string, accountId: string): Promise<DeviceState> {
        await this.checkDevicePermission(deviceId, serial_number, accountId, false);

        const device = await this.prisma.devices.findFirst({
            where: { device_id: deviceId, serial_number, is_deleted: false }
        });

        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        const state = (device?.attribute as DeviceState) || {};

        // Ensure power_status is synced
        return {
            ...state,
            power_status: state.power_status !== undefined ? state.power_status : (device?.power_status || false)
        };
    }

    /**
     * Validate state update against device capabilities
     */
    private validateStateUpdate(stateUpdate: StateUpdateInput, capabilities: any): void {
        const mergedCapabilities = capabilities.merged_capabilities?.capabilities || [];
        const deviceCapabilities = Array.isArray(mergedCapabilities) ? mergedCapabilities : [];

        // Validate color control
        if (stateUpdate.color !== undefined && !deviceCapabilities.includes('RGB_CONTROL')) {
            throwError(ErrorCodes.FORBIDDEN, 'Device does not support color control');
        }

        // Validate brightness control
        if (stateUpdate.brightness !== undefined && !deviceCapabilities.includes('BRIGHTNESS_CONTROL')) {
            throwError(ErrorCodes.FORBIDDEN, 'Device does not support brightness control');
        }

        // Validate alarm control
        if ((stateUpdate.alarmActive !== undefined || stateUpdate.buzzerOverride !== undefined)
            && !deviceCapabilities.includes('ALARM_CONTROL')) {
            throwError(ErrorCodes.FORBIDDEN, 'Device does not support alarm control');
        }

        // Validate output control
        if (stateUpdate.power_status !== undefined && !deviceCapabilities.includes('OUTPUT')) {
            throwError(ErrorCodes.FORBIDDEN, 'Device does not support power control');
        }

        // Validate brightness range
        if (stateUpdate.brightness !== undefined && (stateUpdate.brightness < 0 || stateUpdate.brightness > 100)) {
            throwError(ErrorCodes.BAD_REQUEST, 'Brightness must be between 0 and 100');
        }

        // Validate color format
        if (stateUpdate.color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(stateUpdate.color)) {
            throwError(ErrorCodes.BAD_REQUEST, 'Color must be in hex format (#RRGGBB)');
        }
    }

    /**
     * Backward compatibility methods - delegate to unified state management
     */
    async toggleDevice(deviceId: string, serial_number: string, power_status: boolean, accountId: string): Promise<Device> {
        return this.updateDeviceState(deviceId, serial_number, { power_status }, accountId);
    }

    async updateDeviceAttributes(
        deviceId: string,
        serial_number: string,
        input: { brightness?: number; color?: string },
        accountId: string
    ): Promise<Device> {
        const stateUpdate: StateUpdateInput = {};
        if (input.brightness !== undefined) stateUpdate.brightness = input.brightness;
        if (input.color !== undefined) stateUpdate.color = input.color;

        return this.updateDeviceState(deviceId, serial_number, stateUpdate, accountId);
    }

    async updateDeviceWifi(
        deviceId: string,
        serial_number: string,
        input: { wifi_ssid?: string; wifi_password?: string },
        accountId: string
    ): Promise<Device> {
        const stateUpdate: StateUpdateInput = {};
        if (input.wifi_ssid !== undefined) stateUpdate.wifi_ssid = input.wifi_ssid;
        if (input.wifi_password !== undefined) stateUpdate.wifi_password = input.wifi_password;

        return this.updateDeviceState(deviceId, serial_number, stateUpdate, accountId);
    }

    /**
     * Bulk state update for multiple properties
     */
    async updateDeviceBulkState(
        deviceId: string,
        serial_number: string,
        stateUpdates: StateUpdateInput[],
        accountId: string
    ): Promise<Device> {
        // Merge all state updates
        const mergedUpdate = stateUpdates.reduce((acc, update) => ({ ...acc, ...update }), {});
        return this.updateDeviceState(deviceId, serial_number, mergedUpdate, accountId);
    }


    /**
     * Merge base and runtime capabilities
     */
    private mergeCapabilities(baseCapabilities: any, runtimeCapabilities: any): any {
        if (!baseCapabilities && !runtimeCapabilities) return {};

        const base = baseCapabilities || {};
        const runtime = runtimeCapabilities || {};

        return {
            capabilities: [
                ...(base.capabilities || []),
                ...(runtime.capabilities || [])
            ].filter((value, index, self) => self.indexOf(value) === index), // Remove duplicates

            deviceType: runtime.deviceType || base.deviceType,
            category: runtime.category || base.category,
            hardware_version: runtime.hardware_version || base.hardware_version,
            isInput: runtime.isInput !== undefined ? runtime.isInput : base.isInput,
            isOutput: runtime.isOutput !== undefined ? runtime.isOutput : base.isOutput,
            isSensor: runtime.isSensor !== undefined ? runtime.isSensor : base.isSensor,
            isActuator: runtime.isActuator !== undefined ? runtime.isActuator : base.isActuator,

            controls: {
                ...base.controls,
                ...runtime.controls
            }
        };
    }
    
    private mapPrismaDeviceToAuthDevice(device: any): Device {
        return {
            device_id: device!.device_id,
            serial_number: device!.serial_number,
            template_id: device!.template_id ?? null,
            group_id: device!.group_id ?? null, // Include group_id
            space_id: device!.space_id ?? null,
            account_id: device!.account_id ?? null,
            hub_id: device!.hub_id ?? null,
            firmware_id: device!.firmware_id ?? null,
            name: device!.name,
            power_status: device!.power_status ?? null,
            attribute: device!.attribute ?? null,
            wifi_ssid: device!.wifi_ssid ?? null,
            wifi_password: device!.wifi_password ?? null,
            current_value: device!.current_value ?? null,
            link_status: device!.link_status ?? null,
            last_reset_at: device!.last_reset_at ?? null,
            lock_status: device!.lock_status ?? null,
            locked_at: device!.locked_at ?? null,
            created_at: device!.created_at ?? null,
            updated_at: device!.updated_at ?? null,
            is_deleted: device!.is_deleted ?? null,
        };
    }
}

export default DeviceService;