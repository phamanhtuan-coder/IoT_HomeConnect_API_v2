// src/services/device.ts!.service.ts
import { PrismaClient } from "@prisma/client";
import { ErrorCodes, throwError } from "../utils/errors";
import { Server } from "socket.io";
import  AlertService  from "../services/alert.service";
import {Device, DeviceAttributes} from "../types/device";
import {GroupRole} from "../types/group";
import {PermissionType} from "../types/share-request";
import {generateComponentId, generateDeviceId} from "../utils/helpers"; // Import AlertService

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
        templateId: number;
        serial_number: string;
        spaceId?: number;
        accountId: string;
        name: string;
        attribute?: Record<string, any>;
        wifi_ssid?: string;
        wifi_password?: string;
    }): Promise<Device> {
        const { templateId, serial_number, spaceId, accountId, name, attribute, wifi_ssid, wifi_password } = input;

        const template = await this.prisma.device_templates.findUnique({
            where: { template_id: templateId, is_deleted: false },
        });
        if (!template) throwError(ErrorCodes.NOT_FOUND, "Device template not found");

        if (spaceId) {
            const space = await this.prisma.spaces.findUnique({
                where: { space_id: spaceId, is_deleted: false },
            });
            if (!space) throwError(ErrorCodes.NOT_FOUND, "Space not found");
        }

        const existingDevice = await this.prisma.devices.findUnique({
            where: { serial_number },
        });
        if (existingDevice) throwError(ErrorCodes.CONFLICT, "Serial number already exists");

        let device_id: string;
        let attempts = 0;
        const maxAttempts = 5;
        do {
            device_id = generateDeviceId()
            const idExists = await this.prisma.account.findFirst({ where: { device_id: device_id } });
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
                account_id: accountId,
                name,
                power_status: false,
                attribute,
                wifi_ssid,
                wifi_password,
                link_status: "linked",
            },
        });

        return this.mapPrismaDeviceToAuthDevice(device);
    }

    async linkDevice(serial_number: string, spaceId: number | null, accountId: string, name: string): Promise<Device> {
        const device = await this.prisma.devices.findUnique({
            where: { serial_number, is_deleted: false },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found");

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
            io.of("/device.ts").to(`device:${serial_number}`).emit("device_online", { deviceId: serial_number });
        }

        return this.mapPrismaDeviceToAuthDevice(updatedDevice);
    }

    async toggleDevice(deviceId: number, serial_number: string, power_status: boolean, accountId: string): Promise<Device> {
        const device = await this.prisma.devices.findUnique({
            where: { device_id_serial_number: { device_id: deviceId, serial_number }, is_deleted: false },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found");

        await this.checkDevicePermission(deviceId, serial_number, accountId, true);

        const updatedDevice = await this.prisma.devices.update({
            where: { device_id_serial_number: { device_id: deviceId, serial_number } },
            data: { power_status, updated_at: new Date() },
        });

        if (io) {
            io.of("/device.ts").to(`device:${serial_number}`).emit("command", {
                action: "toggle",
                powerStatus: power_status,
            });
        }

        return this.mapPrismaDeviceToAuthDevice(updatedDevice);
    }

    async updateDeviceAttributes(deviceId: number, serial_number: string, input: { brightness?: number; color?: string }, accountId: string): Promise<Device> {
        const device = await this.prisma.devices.findUnique({
            where: { device_id_serial_number: { device_id: deviceId, serial_number }, is_deleted: false },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found");

        await this.checkDevicePermission(deviceId, serial_number, accountId, true);

        const currentAttributes: DeviceAttributes = typeof device!.attribute === "object" && device!.attribute !== null ? device!.attribute : {};
        if (input.brightness !== undefined) currentAttributes.brightness = input.brightness;
        if (input.color !== undefined) currentAttributes.color = input.color;

        const updatedDevice = await this.prisma.devices.update({
            where: { device_id_serial_number: { device_id: deviceId, serial_number } },
            data: { attribute: currentAttributes, updated_at: new Date() },
        });

        if (io) {
            io.of("/device.ts").to(`device:${serial_number}`).emit("command", {
                action: "updateAttributes",
                brightness: input.brightness,
                color: input.color,
            });
        }

        return this.mapPrismaDeviceToAuthDevice(updatedDevice);
    }

    async updateDeviceWifi(deviceId: number, serial_number: string, input: { wifi_ssid?: string; wifi_password?: string }, accountId: string): Promise<Device> {
        const device = await this.prisma.devices.findUnique({
            where: { device_id_serial_number: { device_id: deviceId, serial_number }, is_deleted: false },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found");

        await this.checkDevicePermission(deviceId, serial_number, accountId, true);

        const updatedDevice = await this.prisma.devices.update({
            where: { device_id_serial_number: { device_id: deviceId, serial_number } },
            data: { wifi_ssid: input.wifi_ssid, wifi_password: input.wifi_password, updated_at: new Date() },
        });

        if (io) {
            io.of("/device.ts").to(`device:${serial_number}`).emit("command", {
                action: "updateWifi",
                WifiSSID: input.wifi_ssid,
                WifiPassword: input.wifi_password,
            });
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

    async getDeviceById(deviceId: number, serial_number: string, accountId: string): Promise<Device> {
        const device = await this.prisma.devices.findUnique({
            where: { device_id_serial_number: { device_id: deviceId, serial_number }, is_deleted: false },
            include: { device_templates: true, spaces: true },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found");

        await this.checkDevicePermission(deviceId, serial_number, accountId, false);

        return this.mapPrismaDeviceToAuthDevice(device);
    }

    async unlinkDevice(deviceId: number, serial_number: string, accountId: string): Promise<void> {
        const device = await this.prisma.devices.findUnique({
            where: { device_id_serial_number: { device_id: deviceId, serial_number }, account_id: accountId, is_deleted: false },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found or access denied");

        await this.prisma.devices.update({
            where: { device_id_serial_number: { device_id: deviceId, serial_number } },
            data: { account_id: null, space_id: null, link_status: "unlinked", updated_at: new Date() },
        });

        // Create an alert for device.ts unlink
        await alertService.createAlert(
            // @ts-ignore
             device,
            3, // Assume alert_type_id 3 for device.ts unlink (adjust based on your alert_types table)
            `Device ${serial_number} has been unlinked`
        );

        if (io) {
            io.of("/device.ts").to(`device:${serial_number}`).emit("device_disconnect", { deviceId: serial_number });
        }
    }

    async updateDeviceSpace(deviceId: number, serial_number: string, spaceId: number | null, accountId: string): Promise<Device> {
        const device = await this.prisma.devices.findUnique({
            where: { device_id_serial_number: { device_id: deviceId, serial_number }, account_id: accountId, is_deleted: false },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found or access denied");

        if (spaceId) {
            const space = await this.prisma.spaces.findUnique({
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

    async checkDevicePermission(deviceId: number, serial_number: string, accountId: string, requireControl: boolean): Promise<void> {
        const device = await this.prisma.devices.findUnique({
            where: { device_id_serial_number: { device_id: deviceId, serial_number }, is_deleted: false },
            include: { spaces: { include: { houses: true } } },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found");

        if (device!.account_id === accountId) return;

        const groupId = device!.group_id || device!.spaces?.houses?.group_id;
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

        const permission = await this.prisma.shared_permissions.findFirst({
            where: {
                device_serial: device!.serial_number,
                shared_with_user_id: accountId,
                is_deleted: false,
            },
        });
        if (permission && (!requireControl || permission.permission_type === PermissionType.CONTROL)) {
            return;
        }

        throwError(ErrorCodes.FORBIDDEN, "No permission to access this device.ts");
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

    private mapPrismaDeviceToAuthDevice(device: any): Device {
        return {
            device_id: device!.device_id,
            serial_number: device!.serial_number,
            template_id: device!.template_id ?? null,
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