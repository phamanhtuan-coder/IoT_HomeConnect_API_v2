// src/services/door?.service.ts
import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from "../utils/errors";
import { Server } from 'socket.io';
import {
    DoorState,
    DoorAction,
    DoorConfig,
    DoorSensorData,
    DoorStatusResponse,
    DoorCommandData,
    EmergencyDoorOperation
} from '../types/door.types';
import { Device } from '../types/device';

let io: Server | null = null;

export function setSocketInstance(socket: Server) {
    io = socket;
}

export class DoorService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * Chuyển đổi thiết bị từ Prisma thành định dạng Device
     */
    private mapPrismaDeviceToDevice(device: any): Device {
        return {
            device_id: device.device_id,
            serial_number: device.serial_number,
            template_id: device.template_id,
            space_id: device.space_id,
            account_id: device.account_id,
            group_id: device.group_id,
            hub_id: device.hub_id,
            firmware_id: device.firmware_id,
            name: device.name,
            power_status: device.power_status,
            attribute: device.attribute,
            wifi_ssid: device.wifi_ssid,
            wifi_password: device.wifi_password,
            current_value: device.current_value,
            link_status: device.link_status,
            last_reset_at: device.last_reset_at,
            lock_status: device.lock_status,
            locked_at: device.locked_at,
            created_at: device.created_at,
            updated_at: device.updated_at,
            is_deleted: device.is_deleted
        };
    }

    /**
     * Toggle trạng thái cửa
     */
    async toggleDoor(
        serialNumber: string,
        powerStatus: boolean,
        accountId: string,
        force: boolean = false,
        timeout: number = 5000
    ): Promise<Device> {
        const door = await this.getDoorBySerial(serialNumber, accountId);
        if (!door) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy cửa');

        const currentAttribute = (door?.attribute as Record<string, any>) || {};
        if (!force && currentAttribute.is_moving) {
            throwError(ErrorCodes.CONFLICT, 'Cửa đang di chuyển. Sử dụng force=true để ghi đè.');
        }

        const newState = {
            ...currentAttribute,
            power_status: powerStatus,
            door_state: powerStatus ? DoorState.OPENING : DoorState.CLOSING,
            target_state: powerStatus ? DoorState.OPEN : DoorState.CLOSED,
            last_command: powerStatus ? 'OPEN' : 'CLOSE',
            command_timeout: timeout
        };

        const updatedDevice = await this.prisma.devices.update({
            where: { serial_number: serialNumber },
            data: {
                attribute: newState,
                power_status: powerStatus,
                updated_at: new Date()
            }
        });

        if (io) {
            io.of("/door").to(`door:${serialNumber}`).emit('command', {
                action: DoorAction.TOGGLE,
                state: { power_status: powerStatus },
                timeout,
                force,
                timestamp: new Date().toISOString()
            });
        }

        return this.mapPrismaDeviceToDevice(updatedDevice);
    }

    /**
     * Thực hiện thao tác khẩn cấp trên nhiều cửa
     */
    async executeEmergencyDoorOperation(
        operation: EmergencyDoorOperation,
        accountId: string
    ): Promise<{ success: boolean; affected_doors: string[]; errors: any[] }> {
        const results: string[] = [];
        const errors: any[] = [];

        for (const doorSerial of operation.affected_doors) {
            try {
                await this.toggleDoor(
                    doorSerial,
                    operation.action === 'open_all',
                    accountId,
                    operation.override_manual,
                    10000
                );
                results.push(doorSerial);
            } catch (error: any) {
                errors.push({ door: doorSerial, error: error.message });
            }
        }


        if (io) {
            io.of("/door").emit('emergency_operation', {
                ...operation,
                affected_doors: results,
                errors,
                timestamp: new Date().toISOString()
            });
        }

        return { success: errors.length === 0, affected_doors: results, errors };
    }

    /**
     * Xử lý dữ liệu cảm biến từ cửa
     */
    async processDoorSensorData(sensorData: DoorSensorData): Promise<void> {
        const door = await this.prisma.devices.findFirst({
            where: { serial_number: sensorData.serialNumber, is_deleted: false }
        });
        if (!door) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy cửa');

        const currentAttribute = (door?.attribute as Record<string, any>) || {};
        const stateUpdate = {
            ...currentAttribute,
            door_state: sensorData.door_state,
            servo_angle: sensorData.servo_angle,
            is_moving: sensorData.is_moving,
            obstacle_detected: sensorData.obstacle_detected || false,
            manual_override: sensorData.manual_override || false,
            signal_strength: sensorData.signal_strength,
            battery_level: sensorData.battery_level,
            last_seen: sensorData.timestamp
        };

        await this.prisma.devices.update({
            where: { serial_number: sensorData.serialNumber },
            data: {
                attribute: stateUpdate,
                updated_at: new Date()
            }
        });

        if (io) {
            io.of("/door").to(`door:${sensorData.serialNumber}`).emit('sensor_data', {
                ...sensorData,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Cập nhật cấu hình cửa
     */
    async updateDoorConfig(
        serialNumber: string,
        config: Partial<DoorConfig>,
        accountId: string
    ): Promise<Device> {
        const door = await this.getDoorBySerial(serialNumber, accountId);
        if (!door) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy cửa');

        this.validateDoorConfig(config);

        const currentAttribute = (door?.attribute as Record<string, any>) || {};
        const updatedAttribute = {
            ...currentAttribute,
            config: {
                ...currentAttribute.config,
                ...config
            }
        };

        const updatedDevice = await this.prisma.devices.update({
            where: { serial_number: serialNumber },
            data: {
                attribute: updatedAttribute,
                updated_at: new Date()
            }
        });

        if (io) {
            io.of("/door").to(`door:${serialNumber}`).emit('config_update', {
                serialNumber,
                config,
                timestamp: new Date().toISOString()
            });
        }

        return this.mapPrismaDeviceToDevice(updatedDevice);
    }

    /**
     * Lấy thông tin cửa theo serial number
     */
    async getDoorBySerial(serialNumber: string, accountId: string): Promise<Device | null> {
        const device = await this.prisma.devices.findFirst({
            where: {
                serial_number: serialNumber,
                is_deleted: false,
                OR: [
                    { account_id: accountId },
                    {
                        spaces: {
                            houses: {
                                groups: {
                                    user_groups: { some: { account_id: accountId, is_deleted: false } }
                                }
                            }
                        }
                    },
                    { shared_permissions: { some: { shared_with_user_id: accountId, is_deleted: false } } }
                ]
            }
        });

        return device ? this.mapPrismaDeviceToDevice(device) : null;
    }

    /**
     * Lấy danh sách cửa của người dùng
     */
    async getUserDoors(accountId: string, filters: any): Promise<Device[]> {
        const whereClause: any = {
            is_deleted: false,
            OR: [
                { account_id: accountId },
                {
                    spaces: {
                        houses: {
                            group: {
                                user_groups: { some: { account_id: accountId, is_deleted: false } }
                            }
                        }
                    }
                }
            ]
        };

        if (filters.state) whereClause.attribute = { path: ['door_state'], equals: filters.state };
        if (filters.is_moving !== undefined) whereClause.attribute = { path: ['is_moving'], equals: filters.is_moving };

        const doors = await this.prisma.devices.findMany({ where: whereClause });
        return doors.map(this.mapPrismaDeviceToDevice);
    }


    /**
     * Xác thực cấu hình cửa
     */
    private validateDoorConfig(config: Partial<DoorConfig>): void {
        if (config.servo_open_angle !== undefined && (config.servo_open_angle < 0 || config.servo_open_angle > 180)) {
            throwError(ErrorCodes.BAD_REQUEST, 'Góc mở servo phải từ 0 đến 180 độ');
        }
        if (config.servo_close_angle !== undefined && (config.servo_close_angle < 0 || config.servo_close_angle > 180)) {
            throwError(ErrorCodes.BAD_REQUEST, 'Góc đóng servo phải từ 0 đến 180 độ');
        }
        if (config.movement_duration !== undefined && (config.movement_duration < 500 || config.movement_duration > 5000)) {
            throwError(ErrorCodes.BAD_REQUEST, 'Thời gian di chuyển phải từ 500ms đến 5000ms');
        }
    }
}