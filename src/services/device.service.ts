import {Prisma, PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";
import { Server } from "socket.io";
import AlertService from "../services/alert.service";
import {Device, DeviceAttributes} from "../types/device";
import {GroupRole} from "../types/group";
import {PermissionType} from "../types/share-request";
import {generateComponentId, generateDeviceId} from "../utils/helpers";
import {
    AVAILABLE_LED_EFFECTS,
    DeviceState,
    LEDEffectInput,
    LEDEffectParams, LEDPresetMap, PresetInput,
    StateUpdateInput
} from "../types/device-state";
import prisma from "../config/database";

let io: Server | null = null;
const alertService = new AlertService();

export function setSocketInstance(socket: Server) {
    io = socket;
}

class DeviceService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma
    }

    async createDevice(input: {
        templateId: string;
        serial_number: string;
        spaceId?: number;
        groupId?: number;
        accountId?: string;
        name: string;
        attribute?: Record<string, any>;
        wifi_ssid?: string;
        wifi_password?: string;
    }): Promise<Device> {
        const { templateId, serial_number, spaceId, groupId, accountId, name, attribute, wifi_ssid, wifi_password } = input;

        const template = await this.prisma.device_templates.findFirst({
            where: { template_id: templateId, is_deleted: false },
        });
        if (!template) throwError(ErrorCodes.NOT_FOUND, "Device template not found");

        let finalGroupId = groupId;
        if (spaceId) {
            const space = await this.prisma.spaces.findFirst({
                where: { space_id: spaceId, is_deleted: false },
                include: { houses: { select: { group_id: true } } }
            });
            if (!space) throwError(ErrorCodes.NOT_FOUND, "Space not found");
            if (!groupId && space?.houses?.group_id) finalGroupId = space.houses.group_id;
        }

        if (finalGroupId) {
            const group = await this.prisma.groups.findFirst({
                where: { group_id: finalGroupId, is_deleted: false }
            });
            if (!group) throwError(ErrorCodes.NOT_FOUND, "Group not found");
        }

        const existingDevice = await this.prisma.devices.findFirst({ where: { serial_number } });
        if (existingDevice) throwError(ErrorCodes.CONFLICT, "Serial number already exists");

        let device_id: string;
        let attempts = 0;
        const maxAttempts = 5;
        do {
            device_id = generateDeviceId();
            const idExists = await this.prisma.devices.findFirst({ where: { device_id } });
            if (!idExists) break;
            attempts++;
            if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique ID');
        } while (true);

        const device = await this.prisma.devices.create({
            data: {
                device_id,
                serial_number,
                template_id: templateId,
                space_id: spaceId,
                group_id: finalGroupId,
                account_id: accountId || null,
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
        const device = await this.prisma.devices.findUnique({ where: { serial_number, is_deleted: false } });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        if (spaceId) {
            const space = await this.prisma.spaces.findUnique({ where: { space_id: spaceId, is_deleted: false } });
            if (!space) throwError(ErrorCodes.NOT_FOUND, "Space not found");
        }

        const updatedDevice = await this.prisma.devices.update({
            where: { serial_number },
            data: { account_id: accountId, space_id: spaceId, name, link_status: "linked", updated_at: new Date() },
        });

        if (io) io.of("/device").to(`device:${serial_number}`).emit("device_online", { serialNumber: serial_number });

        return this.mapPrismaDeviceToAuthDevice(updatedDevice);
    }

    async getDevicesByAccount(accountId: string, search: string): Promise<Device[]> {
        const devices = await this.prisma.devices.findMany({
            where: {
                account_id: accountId,
                is_deleted: false,
            },
            include: {
                device_templates: {
                    include: {
                        categories: {
                            include: {
                                categories: true
                            }
                        }
                    }
                },
                spaces: {
                    include: {
                        houses: true
                    }
                },
                firmware: true
            },
        });

        const searchValue = search?.toLowerCase().trim();
        const filteredDevices = searchValue
        ? devices.filter(device =>
            device.name?.toLowerCase().includes(searchValue) ||
            device.serial_number?.toLowerCase().includes(searchValue)
            )
        : devices;

        return filteredDevices.map((device) => ({
            ...this.mapPrismaDeviceToAuthDevice(device),    
            device_type_id: device.device_templates?.device_type_id ?? null,
            device_type_name: device.device_templates?.categories?.name ?? null,
            device_type_parent_name: device.device_templates?.categories?.categories?.name ?? null,
            device_type_parent_image: device.device_templates?.categories?.categories?.image ? `data:image/png;base64,${device.device_templates?.categories?.categories?.image}` : null,
            device_template_name: device.device_templates?.name ?? null,
            device_template_status: device.device_templates?.status ?? null,
            device_base_capabilities: device.device_templates?.base_capabilities ?? null
        }));
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
            include: {
                device_templates: {
                    include: {
                        categories: true
                    }
                },
                spaces: {
                    include: {
                        houses: true
                    }
                },
                firmware: true
            },
        });

        return devices.map((device) => ({
            ...this.mapPrismaDeviceToAuthDevice(device),
            device_type_id: device.device_templates?.device_type_id ?? null,
            device_type_name: device.device_templates?.categories?.name ?? null,
            device_template_name: device.device_templates?.name ?? null,
            device_template_status: device.device_templates?.status ?? null,
            device_base_capabilities: device.device_templates?.base_capabilities ?? null
        }));
    }

    async getDevicesByHouse(houseId: number): Promise<Device[]> {
        const devices = await this.prisma.devices.findMany({
            where: {
                is_deleted: false,
                spaces: { house_id: houseId, is_deleted: false },
            },
            include: {
                device_templates: {
                    include: {
                        categories: true
                    }
                },
                spaces: {
                    include: {
                        houses: true
                    }
                },
                firmware: true
            },
        });

        return devices.map((device) => ({
            ...this.mapPrismaDeviceToAuthDevice(device),
            device_type_id: device.device_templates?.device_type_id ?? null,
            device_type_name: device.device_templates?.categories?.name ?? null,
            device_template_name: device.device_templates?.name ?? null,
            device_template_status: device.device_templates?.status ?? null,
            device_base_capabilities: device.device_templates?.base_capabilities ?? null
        }));
    }

    async getDevicesBySpace(spaceId: number): Promise<Device[]> {
        const devices = await this.prisma.devices.findMany({
            where: { space_id: spaceId, is_deleted: false },
            include: {
                device_templates: {
                    include: {
                        categories: true
                    }
                },
                spaces: {
                    include: {
                        houses: true
                    }
                },
                firmware: true
            },
        });

        return devices.map((device) => ({
            ...this.mapPrismaDeviceToAuthDevice(device),
            device_type_id: device.device_templates?.device_type_id ?? null,
            device_type_name: device.device_templates?.categories?.name ?? null,
            device_template_name: device.device_templates?.name ?? null,
            device_template_status: device.device_templates?.status ?? null,
            device_base_capabilities: device.device_templates?.base_capabilities ?? null
        }));
    }

    async getDeviceById(serial_number: string, accountId: string): Promise<Device> {
        const device = await this.prisma.devices.findFirst({
            where: { serial_number: serial_number, is_deleted: false },
            include: {
                device_templates: {
                    include: {
                        categories: true
                    }
                },
                spaces: {
                    include: {
                        houses: true
                    }
                },
                firmware: true
            },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        await this.checkDevicePermission(serial_number, accountId, false);

        try {
            const capabilities = await this.getDeviceCapabilities(serial_number);

            return {
                ...this.mapPrismaDeviceToAuthDevice(device),
                device_type_id: device?.device_templates?.device_type_id ?? null,
                device_type_name: device?.device_templates?.categories?.name ?? null,
                device_template_name: device?.device_templates?.name ?? null,
                device_template_status: device?.device_templates?.status ?? null,
                device_base_capabilities: device?.device_templates?.base_capabilities ?? null,
                capabilities
            };
        } catch (error) {
            return {
                ...this.mapPrismaDeviceToAuthDevice(device),
                device_type_id: device?.device_templates?.device_type_id ?? null,
                device_type_name: device?.device_templates?.categories?.name ?? null,
                device_template_name: device?.device_templates?.name ?? null,
                device_template_status: device?.device_templates?.status ?? null,
                device_base_capabilities: device?.device_templates?.base_capabilities ?? null
            };
        }
    }

    async unlinkDevice(serial_number: string, accountId: string): Promise<void> {
        const device = await this.prisma.devices.findFirst({
            where: { serial_number, is_deleted: false },
            include: { device_templates: true },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found");

        if (device!.account_id !== accountId) throwError(ErrorCodes.FORBIDDEN, "No permission to unlink this device");

        const updatedDevice = await this.prisma.devices.update({
            where: { serial_number },
            data: {
                account_id: null,
                space_id: null,
                link_status: "unlinked",
                runtime_capabilities: Prisma.JsonNull,
                updated_at: new Date(),
            },
        });

        const deviceForAlert: Device = {
            device_id: device!.device_id,
            serial_number: device!.serial_number,
            template_id: device!.template_id,
            group_id: device!.group_id,
            space_id: device!.space_id,
            account_id: device!.account_id,
            hub_id: device!.hub_id,
            firmware_id: device!.firmware_id,
            name: device!.name,
            current_value: device!.current_value as Record<string, any> | null,
            power_status: device!.power_status,
            attribute: device!.attribute as Record<string, any> | null,
            wifi_ssid: device!.wifi_ssid,
            wifi_password: device!.wifi_password,
            link_status: device!.link_status,
            last_reset_at: device!.last_reset_at,
            lock_status: device!.lock_status,
            locked_at: device!.locked_at,
            created_at: device!.created_at,
            updated_at: device!.updated_at,
            is_deleted: device!.is_deleted,
        };

        await alertService.createAlert(deviceForAlert, 3, `Device ${device!.name || serial_number} has been unlinked`);

        if (io) {
            io.of("/device").to(`device:${serial_number}`).emit("device_disconnect", {
                serialNumber: serial_number,
                timestamp: new Date().toISOString(),
            });
        }
    }

    async updateDeviceSpace(serial_number: string, spaceId: number | null, accountId: string): Promise<Device> {
        const device = await this.prisma.devices.findFirst({
            where: { serial_number, account_id: accountId, is_deleted: false },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị or access denied");

        if (spaceId) {
            const space = await this.prisma.spaces.findFirst({ where: { space_id: spaceId, is_deleted: false } });
            if (!space) throwError(ErrorCodes.NOT_FOUND, "Space not found");
        }

        const updatedDevice = await this.prisma.devices.update({
            where: { serial_number },
            data: { space_id: spaceId, updated_at: new Date() },
        });

        return this.mapPrismaDeviceToAuthDevice(updatedDevice);
    }

    async checkDevicePermission( serial_number: string, accountId: string, requireControl: boolean): Promise<void> {
        const device = await this.prisma.devices.findFirst({
            where: { serial_number, is_deleted: false },
            include: { spaces: { include: { houses: true } } },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        if (device!.account_id === accountId) return;

        const groupId = device!.group_id || device!.spaces?.houses?.group_id;
        if (groupId) {
            const userGroup = await this.prisma.user_groups.findFirst({
                where: { group_id: groupId, account_id: accountId, is_deleted: false },
            });
            if (userGroup && userGroup.role) {
                const role = userGroup.role as GroupRole;
                if (!requireControl || [GroupRole.OWNER, GroupRole.VICE, GroupRole.ADMIN].includes(role)) return;
            }
        }

        const sharedPermission = await this.prisma.shared_permissions.findFirst({
            where: { device_serial: serial_number, shared_with_user_id: accountId, is_deleted: false },
        });
        if (sharedPermission) {
            if (requireControl && sharedPermission.permission_type !== PermissionType.CONTROL) {
                throwError(ErrorCodes.FORBIDDEN, "Control permission required");
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

        for (const device of devices) {
            const deviceForAlert: Device = {
                device_id: device!.device_id,
                serial_number: device!.serial_number,
                template_id: device!.template_id,
                group_id: device!.group_id,
                space_id: device!.space_id,
                account_id: device!.account_id,
                hub_id: device!.hub_id,
                firmware_id: device!.firmware_id,
                name: device!.name,
                power_status: device!.power_status,
                attribute: device!.attribute as Record<string, any> | null,
                wifi_ssid: device!.wifi_ssid,
                wifi_password: device!.wifi_password,
                current_value: device!.current_value as Record<string, any> | null,
                link_status: device!.link_status,
                last_reset_at: device!.last_reset_at,
                lock_status: device!.lock_status,
                locked_at: device!.locked_at,
                created_at: device!.created_at,
                updated_at: device!.updated_at,
                is_deleted: device!.is_deleted,
            };

            await alertService.createAlert(deviceForAlert, 3, `Device ${device!.name || device!.serial_number} unlinked from group`);
        }

        if (io) {
            devices.forEach((device) => {
                io!.of("/device").to(`device:${device!.serial_number}`).emit("device_disconnect", {
                    serialNumber: device!.serial_number,
                    timestamp: new Date().toISOString(),
                });
            });
        }
    }

    async getDeviceCapabilities(serial_number: string): Promise<any> {
        const device = await this.prisma.devices.findFirst({
            where: { serial_number, is_deleted: false },
            include: { device_templates: true, firmware: true },
        });

        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        const baseCapabilities = device!.device_templates?.base_capabilities || {};
        const runtimeCapabilities = device!.runtime_capabilities || {};
        console.log("baseCapabilities", baseCapabilities)
        console.log("runtimeCapabilities", runtimeCapabilities)
        return {
            base: baseCapabilities,
            runtime: runtimeCapabilities,
            firmware_version: device!.firmware?.version || null,
            firmware_id: device!.firmware_id,
            merged_capabilities: this.mergeCapabilities(baseCapabilities, runtimeCapabilities),
        };
    }

    async updateDeviceCapabilities(serial_number: string, capabilities: any): Promise<void> {
        const device = await this.prisma.devices.findFirst({ where: { serial_number, is_deleted: false } });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        await this.prisma.devices.update({
            where: { serial_number },
            data: { runtime_capabilities: capabilities, updated_at: new Date() },
        });

        if (io) {
            io.of("/device").to(`device:${serial_number}`).emit("capabilities_updated", {
                serialNumber: serial_number,
                capabilities,
                timestamp: new Date().toISOString(),
            });
        }
    }

    async updateDeviceState(serial_number: string, stateUpdate: StateUpdateInput, accountId: string): Promise<Device> {
        await this.checkDevicePermission(serial_number, accountId, true);

        const device = await this.prisma.devices.findFirst({
            where: { serial_number, is_deleted: false },
            include: { device_templates: true, firmware: true },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        const capabilities = await this.getDeviceCapabilities(serial_number);
        console.log("capabilities", capabilities)
        this.validateStateUpdate(stateUpdate, capabilities);

        const currentState = (device!.attribute as DeviceState) || {};
        const newState: DeviceState = {
            ...currentState,
            ...stateUpdate,
            power_status: stateUpdate.power_status !== undefined ? stateUpdate.power_status : (currentState.power_status || false),
        };

        const updatedDevice = await this.prisma.devices.update({
            where: { serial_number },
            data: {
                attribute: newState,
                power_status: newState.power_status,
                ...(stateUpdate.wifi_ssid && { wifi_ssid: stateUpdate.wifi_ssid }),
                ...(stateUpdate.wifi_password && { wifi_password: stateUpdate.wifi_password }),
                updated_at: new Date(),
            },
        });

        if (io) {
            io.of("/device").to(`device:${serial_number}`).emit("command", {
                action: "updateState",
                serialNumber: serial_number,
                state: stateUpdate,
                timestamp: new Date().toISOString(),
            });
        }

        return this.mapPrismaDeviceToAuthDevice(updatedDevice);
    }

    async getDeviceState(serial_number: string, accountId: string): Promise<DeviceState> {
        await this.checkDevicePermission( serial_number, accountId, false);

        const device = await this.prisma.devices.findFirst({ where: { serial_number, is_deleted: false } });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        const state = (device!.attribute as DeviceState) || {};
        return {
            ...state,
            power_status: state.power_status !== undefined ? state.power_status : (device!.power_status || false),
        };
    }

    private validateStateUpdate(stateUpdate: StateUpdateInput, capabilities: any): void {
        const mergedCapabilities = capabilities.merged_capabilities?.capabilities || [];
        const deviceCapabilities = Array.isArray(mergedCapabilities) ? mergedCapabilities : [];

        if (stateUpdate.color !== undefined && !deviceCapabilities.includes('RGB_CONTROL')) {
            throwError(ErrorCodes.FORBIDDEN, 'Device does not support color control');
        }
        console.log("deviceCapabilities", deviceCapabilities)

        if (stateUpdate.brightness !== undefined && !deviceCapabilities.includes('BRIGHTNESS_CONTROL')) {
            throwError(ErrorCodes.FORBIDDEN, 'Device does not support brightness control');
        }

        if ((stateUpdate.alarmActive !== undefined || stateUpdate.buzzerOverride !== undefined) && !deviceCapabilities.includes('ALARM_CONTROL')) {
            throwError(ErrorCodes.FORBIDDEN, 'Device does not support alarm control');
        }

        if (stateUpdate.power_status !== undefined && !deviceCapabilities.includes('OUTPUT')) {
            throwError(ErrorCodes.FORBIDDEN, 'Device does not support power control');
        }

        if (stateUpdate.brightness !== undefined && (stateUpdate.brightness < 0 || stateUpdate.brightness > 100)) {
            throwError(ErrorCodes.BAD_REQUEST, 'Brightness must be between 0 and 100');
        }

        if (stateUpdate.color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(stateUpdate.color)) {
            throwError(ErrorCodes.BAD_REQUEST, 'Color must be in hex format (#RRGGBB)');
        }
    }

    async toggleDevice(serial_number: string, power_status: boolean, accountId: string): Promise<Device> {
        return this.updateDeviceState(serial_number, { power_status }, accountId);
    }

    async updateDeviceAttributes(serial_number: string, input: { brightness?: number; color?: string }, accountId: string): Promise<Device> {
        const stateUpdate: StateUpdateInput = {};
        if (input.brightness !== undefined) stateUpdate.brightness = input.brightness;
        if (input.color !== undefined) stateUpdate.color = input.color;

        return this.updateDeviceState(serial_number, stateUpdate, accountId);
    }

    async updateDeviceWifi(serial_number: string, input: { wifi_ssid?: string; wifi_password?: string }, accountId: string): Promise<Device> {
        const stateUpdate: StateUpdateInput = {};
        if (input.wifi_ssid !== undefined) stateUpdate.wifi_ssid = input.wifi_ssid;
        if (input.wifi_password !== undefined) stateUpdate.wifi_password = input.wifi_password;

        return this.updateDeviceState(serial_number, stateUpdate, accountId);
    }

    async updateDeviceBulkState(serial_number: string, stateUpdates: StateUpdateInput[], accountId: string): Promise<Device> {
        const mergedUpdate = stateUpdates.reduce((acc, update) => ({ ...acc, ...update }), {});
        return this.updateDeviceState(serial_number, mergedUpdate, accountId);
    }

    async applyLEDPreset(serial_number: string, preset: string, duration: number | undefined, accountId: string): Promise<Device> {
        await this.checkDevicePermission(serial_number, accountId, true);

        const device = await this.prisma.devices.findFirst({
            where: { serial_number, is_deleted: false },
            include: { device_templates: true }
        });

        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        const capabilities = await this.getDeviceCapabilities(serial_number);
        this.validateLEDSupport(capabilities);

        const presets = this.getLEDPresets();
        if (!presets[preset]) {
            throwError(ErrorCodes.BAD_REQUEST, `Invalid preset: ${preset}. Available presets: ${Object.keys(presets).join(', ')}`);
        }

        const presetEffectInput = { ...presets[preset] }; // Clone to avoid mutation
        if (duration !== undefined) {
            presetEffectInput.duration = Math.max(0, Math.min(300000, duration));
        }

        const command = {
            action: 'applyPreset',  // FIXED: Changed from 'command' to 'applyPreset'
            serialNumber: serial_number,
            preset,
            duration: presetEffectInput.duration,
            // Include all preset parameters for ESP8266
            effect: presetEffectInput.effect,
            speed: presetEffectInput.speed,
            count: presetEffectInput.count,
            color1: presetEffectInput.color1,
            color2: presetEffectInput.color2,
            fromClient: accountId,
            timestamp: new Date().toISOString()
        };

        if (io) {
            io.of("/device").to(`device:${serial_number}`).emit("command", command);
            console.log(`[LED] Sent applyPreset command to device ${serial_number}:`, command);
        }

        // Update device state with preset info
        const currentState = (device?.attribute as DeviceState) || {};
        const newState: DeviceState = {
            ...currentState,
            effect: preset,
            effect_active: true,
            effect_preset: preset,
            effect_params: presetEffectInput
        };

        const updatedDevice = await this.prisma.devices.update({
            where: { serial_number },
            data: {
                attribute: newState,
                updated_at: new Date()
            }
        });

        return this.mapPrismaDeviceToAuthDevice(updatedDevice);
    }

    async setLEDEffect(serial_number: string, effectInput: LEDEffectInput, accountId: string): Promise<Device> {
        await this.checkDevicePermission(serial_number, accountId, true);

        const device = await this.prisma.devices.findFirst({
            where: { serial_number, is_deleted: false },
            include: { device_templates: true, firmware: true },
        });

        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        const capabilities = await this.getDeviceCapabilities(serial_number);
        this.validateLEDSupport(capabilities);

        // Sanitize and normalize effect parameters
        const normalizedEffect: LEDEffectParams = {
            effect: effectInput.effect,
            speed: Math.max(50, Math.min(5000, effectInput.speed || 1000)),
            count: Math.max(0, Math.min(100, effectInput.count || 0)),
            duration: Math.max(0, Math.min(300000, effectInput.duration || 0)),
            color1: effectInput.color1 || '#FFFFFF',
            color2: effectInput.color2 || effectInput.color1 || '#FFFFFF'
        };

        const command = {
            action: 'setEffect',  // FIXED: Changed from 'command' to 'setEffect'
            serialNumber: serial_number,
            ...normalizedEffect,
            fromClient: accountId,
            timestamp: new Date().toISOString()
        };

        if (io) {
            io.of("/device").to(`device:${serial_number}`).emit("command", command);
            console.log(`[LED] Sent setEffect command to device ${serial_number}:`, command);
        }

        // Update device state
        const currentState = (device?.attribute as DeviceState) || {};
        const newState: DeviceState = {
            ...currentState,
            effect: normalizedEffect.effect,
            effect_active: true,
            effect_preset: "",
            effect_params: normalizedEffect
        };

        const updatedDevice = await this.prisma.devices.update({
            where: { serial_number },
            data: {
                attribute: newState,
                updated_at: new Date()
            }
        });

        return this.mapPrismaDeviceToAuthDevice(updatedDevice);
    }

    private getLEDPresets(): LEDPresetMap {
        return {
            party_mode: { effect: 'rainbow', speed: 200, count: 0, duration: 0, color1: '#FF0080', color2: '#00FF80' },
            relaxation_mode: { effect: 'breathe', speed: 2000, count: 0, duration: 0, color1: '#9370DB', color2: '#4169E1' },
            gaming_mode: { effect: 'chase', speed: 150, count: 0, duration: 0, color1: '#00FF80', color2: '#FF0080' },
            alarm_mode: { effect: 'strobe', speed: 200, count: 20, duration: 10000, color1: '#FF0000', color2: '#000000' },
            sleep_mode: { effect: 'fade', speed: 5000, count: 0, duration: 30000, color1: '#FFB366', color2: '#2F1B14' },
            wake_up_mode: { effect: 'fade', speed: 2000, count: 0, duration: 30000, color1: '#330000', color2: '#FFB366' },
            focus_mode: { effect: 'solid', speed: 500, count: 0, duration: 0, color1: '#4169E1', color2: '#4169E1' },
            movie_mode: { effect: 'breathe', speed: 3000, count: 0, duration: 0, color1: '#000080', color2: '#191970' },
            romantic_mode: { effect: 'pulse', speed: 1500, count: 0, duration: 0, color1: '#FF69B4', color2: '#FF1493' },
            celebration_mode: { effect: 'sparkle', speed: 100, count: 0, duration: 0, color1: '#FFD700', color2: '#FF4500' },
            rainbow_dance: { effect: 'rainbowMove', speed: 100, count: 0, duration: 0 },
            ocean_wave: { effect: 'colorWave', speed: 2000, count: 0, duration: 0, color1: '#0077BE', color2: '#40E0D0' },
            meteor_shower: { effect: 'meteor', speed: 150, count: 0, duration: 0, color1: '#FFFFFF', color2: '#4B0082' },
            christmas_mode: { effect: 'chase', speed: 500, count: 0, duration: 0, color1: '#FF0000', color2: '#00FF00' },
            disco_fever: { effect: 'disco', speed: 120, count: 0, duration: 60000 }
        };
    }

    async stopLEDEffect(serial_number: string, accountId: string): Promise<Device> {
        await this.checkDevicePermission(serial_number, accountId, true);

        const device = await this.prisma.devices.findFirst({
            where: { serial_number, is_deleted: false },
            include: { device_templates: true }
        });

        if (!device) throwError(ErrorCodes.NOT_FOUND, "Không tìm thấy thiết bị");

        const command = {
            action: 'stopEffect',  // FIXED: Changed from 'command' to 'stopEffect'
            serialNumber: serial_number,
            fromClient: accountId,
            timestamp: new Date().toISOString()
        };

        if (io) {
            io.of("/device").to(`device:${serial_number}`).emit("command", command);
            console.log(`[LED] Sent stopEffect command to device ${serial_number}:`, command);
        }

        // Update device state
        const currentState = (device?.attribute as DeviceState) || {};
        const newState: DeviceState = {
            ...currentState,
            effect: 'solid',
            effect_active: false,
            effect_preset: "",
            effect_params: undefined
        };

        const updatedDevice = await this.prisma.devices.update({
            where: { serial_number },
            data: {
                attribute: newState,
                updated_at: new Date()
            }
        });

        return this.mapPrismaDeviceToAuthDevice(updatedDevice);
    }

    public getAvailableLEDEffects(): string[] {
        return [...AVAILABLE_LED_EFFECTS]; // Spread to create mutable copy
    }

    private validateLEDSupport(capabilities: any): void {
        const mergedCapabilities = capabilities.merged_capabilities?.capabilities || [];
        const deviceCapabilities = Array.isArray(mergedCapabilities) ? mergedCapabilities : [];

        if (!deviceCapabilities.includes('RGB_CONTROL')) {
            throwError(ErrorCodes.FORBIDDEN, 'Device does not support RGB control');
        }
    }

    private getComplementaryColor(hexColor: string): string {
        if (!hexColor || hexColor.charAt(0) !== '#' || hexColor.length !== 7) return "#0000FF";

        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);

        const compR = 255 - r;
        const compG = 255 - g;
        const compB = 255 - b;

        return `#${compR.toString(16).padStart(2, '0')}${compG.toString(16).padStart(2, '0')}${compB.toString(16).padStart(2, '0')}`.toUpperCase();
    }

    private mergeCapabilities(baseCapabilities: any, runtimeCapabilities: any): any {
        if (!baseCapabilities && !runtimeCapabilities) return {};

        const base = baseCapabilities || {};
        const runtime = runtimeCapabilities || {};

        return {
            capabilities: [
                ...(base.capabilities || []),
                ...(runtime.capabilities || []),
            ].filter((value, index, self) => self.indexOf(value) === index),
            deviceType: runtime.deviceType || base.deviceType,
            category: runtime.category || base.category,
            hardware_version: runtime.hardware_version || base.hardware_version,
            isInput: runtime.isInput !== undefined ? runtime.isInput : base.isInput,
            isOutput: runtime.isOutput !== undefined ? runtime.isOutput : base.isOutput,
            isSensor: runtime.isSensor !== undefined ? runtime.isSensor : base.isSensor,
            isActuator: runtime.isActuator !== undefined ? runtime.isActuator : base.isActuator,
            controls: { ...base.controls, ...runtime.controls },
        };
    }

    private mapPrismaDeviceToAuthDevice(device: any): Device {
        return {
            device_id: device.device_id,
            serial_number: device.serial_number,
            template_id: device.template_id ?? null,
            group_id: device.group_id ?? null,
            space_id: device.space_id ?? null,
            account_id: device.account_id ?? null,
            hub_id: device.hub_id ?? null,
            firmware_id: device.firmware_id ?? null,
            name: device.name,
            power_status: device.power_status ?? null,
            attribute: device.attribute ?? null,
            wifi_ssid: device.wifi_ssid ?? null,
            wifi_password: device.wifi_password ?? null,
            current_value: device.current_value ?? null,
            link_status: device.link_status ?? null,
            last_reset_at: device.last_reset_at ?? null,
            lock_status: device.lock_status ?? null,
            locked_at: device.locked_at ?? null,
            created_at: device.created_at ?? null,
            updated_at: device.updated_at ?? null,
            is_deleted: device.is_deleted ?? null,
        };
    }
}

export default DeviceService;
