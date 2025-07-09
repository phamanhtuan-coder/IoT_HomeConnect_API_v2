import prisma from '../config/database';
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
import {PrismaClient} from "@prisma/client";

let io: Server | null = null;

export class DoorService {
    private prisma: PrismaClient;
    private readonly maxRetries = 3;
    private readonly retryDelay = 1000; // Base delay in ms

    constructor() {
        this.prisma = prisma;
    }

    /**
     * Generic retry wrapper for database operations
     */
    private async withRetry<T>(
        operation: () => Promise<T>,
        context: string = 'database operation'
    ): Promise<T> {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error: any) {
                const isConnectionError = this.isConnectionError(error);

                if (!isConnectionError || attempt === this.maxRetries) {
                    console.error(`❌ ${context} failed after ${attempt} attempts:`, error);
                    throw error;
                }

                const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.warn(`⚠️ ${context} failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }
        throw new Error(`${context} failed after ${this.maxRetries} attempts`);
    }

    /**
     * Check if error is a connection-related error
     */
    private isConnectionError(error: any): boolean {
        return error.code === 'P2024' ||
            error.message?.includes('connection') ||
            error.message?.includes('timeout') ||
            error.message?.includes('pool');
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
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

    async toggleDoor(
        serialNumber: string,
        powerStatus: boolean,
        accountId: string,
        force: boolean = false,
        timeout: number = 30000
    ): Promise<Device> {
        return this.withRetry(async () => {
            const door = await this.getDoorBySerial(serialNumber, accountId);
            if (!door) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy cửa');

            const currentAttribute = (door?.attribute as Record<string, any>) || {};
            if (!force && currentAttribute.is_moving) {
                throwError(ErrorCodes.CONFLICT, 'Cửa đang di chuyển. Sử dụng force=true để ghi đè.');
            }

            const newState = {
                ...currentAttribute,
                power_status: powerStatus,
                door_state: powerStatus ? DoorState.OPEN : DoorState.CLOSED,
                servo_angle: powerStatus ? 180 : 0, // ESP-01 servo angles: 0° closed, 180° open
                last_command: powerStatus ? 'OPEN' : 'CLOSE',
                command_timeout: timeout,
            };

            const updatedDevice = await this.prisma.devices.update({
                where: { serial_number: serialNumber },
                data: {
                    attribute: newState,
                    power_status: powerStatus,
                    updated_at: new Date(),
                },
            });

            // Send to /client namespace with correct rooms and format
            if (io) {
                const command = {
                    action: powerStatus ? "open_door" : "close_door",
                    serialNumber: serialNumber,
                    fromClient: accountId,
                    esp01_safe: true,
                    state: {
                        power_status: powerStatus,
                        target_angle: powerStatus ? 180 : 0
                    },
                    timestamp: new Date().toISOString()
                };

                console.log(`[DOOR] Sending command to ESP Hub for ${serialNumber}:`, command);

                // Emit to /client namespace, targeting door-specific room
                io.of('/client').to(`door:${serialNumber}`).emit('door_command', command);
            }

            return this.mapPrismaDeviceToDevice(updatedDevice);
        }, `toggleDoor for ${serialNumber}`);
    }

    async executeEmergencyDoorOperation(
        operation: EmergencyDoorOperation,
        accountId: string
    ): Promise<{ success: boolean; affected_doors: string[]; errors: any[] }> {
        const results: string[] = [];
        const errors: any[] = [];

        const batchSize = 3;
        for (let i = 0; i < operation.affected_doors.length; i += batchSize) {
            const batch = operation.affected_doors.slice(i, i + batchSize);

            await Promise.allSettled(
                batch.map(async (doorSerial) => {
                    try {
                        await this.toggleDoor(
                            doorSerial,
                            operation.action === 'open_all',
                            accountId,
                            operation.override_manual,
                            10000
                        );
                        results.push(doorSerial);

                        // Send emergency event to /client namespace
                        if (io && operation.action === 'open_all') {
                            const emergencyCommand = {
                                action: "emergency_open",
                                serialNumber: doorSerial,
                                fromClient: accountId,
                                esp01_safe: true,
                                emergency_type: operation.trigger_source,
                                message: 'Emergency operation',
                                timestamp: new Date().toISOString()
                            };

                            io.of('/client').to(`door:${doorSerial}`).emit('door_command', emergencyCommand);
                        }
                    } catch (error: any) {
                        errors.push({ door: doorSerial, error: error.message });
                    }
                })
            );

            if (i + batchSize < operation.affected_doors.length) {
                await this.sleep(500);
            }
        }

        // Broadcast emergency operation to /client namespace
        if (io) {
            const clientNamespace = io.of('/client');
            clientNamespace.emit('emergency_operation', {
                ...operation,
                affected_doors: results,
                errors,
                timestamp: new Date().toISOString(),
            });
        }

        return { success: errors.length === 0, affected_doors: results, errors };
    }

    async processDoorSensorData(sensorData: DoorSensorData): Promise<void> {
        return this.withRetry(async () => {
            const door = await this.prisma.devices.findFirst({
                where: { serial_number: sensorData.serialNumber, is_deleted: false }
            });

            if (!door) {
                throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy cửa');
            }

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

            // Send sensor data to /client namespace
            if (io) {
                const clientNamespace = io.of('/client');
                clientNamespace.to(`door:${sensorData.serialNumber}`).emit('sensor_data', {
                    ...sensorData,
                    timestamp: new Date().toISOString()
                });
            }
        }, `processDoorSensorData for ${sensorData.serialNumber}`);
    }

    async updateDoorConfig(
        serialNumber: string,
        config: Partial<DoorConfig>,
        accountId: string
    ): Promise<Device> {
        return this.withRetry(async () => {
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

            // Send config update to /client namespace
            if (io) {
                const configCommand = {
                    action: "update_config",
                    serialNumber: serialNumber,
                    fromClient: accountId,
                    esp01_safe: true,
                    config: config,
                    timestamp: new Date().toISOString()
                };

                io.of('/client').to(`door:${serialNumber}`).emit('door_command', configCommand);

                // Also notify clients
                const clientNamespace = io.of('/client');
                clientNamespace.to(`door:${serialNumber}`).emit('config_update', {
                    serialNumber,
                    config,
                    timestamp: new Date().toISOString()
                });
            }

            return this.mapPrismaDeviceToDevice(updatedDevice);
        }, `updateDoorConfig for ${serialNumber}`);
    }

    async getDoorBySerial(serialNumber: string, accountId: string): Promise<Device | null> {
        return this.withRetry(async () => {
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
                        {
                            shared_permissions: {
                                some: {
                                    shared_with_user_id: accountId,
                                    is_deleted: false
                                }
                            }
                        }
                    ]
                }
            });

            return device ? this.mapPrismaDeviceToDevice(device) : null;
        }, `getDoorBySerial for ${serialNumber}`);
    }

    async getUserDoors(
        accountId: string,
        filters: any,
        page: number = 1,
        limit: number = 50
    ): Promise<{ doors: Device[]; total: number }> {
        return this.withRetry(async () => {
            const skip = (page - 1) * limit;

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

            if (filters.state) {
                whereClause.attribute = { path: ['door_state'], equals: filters.state };
            }
            if (filters.is_moving !== undefined) {
                whereClause.attribute = { path: ['is_moving'], equals: filters.is_moving };
            }

            const [doors, total] = await Promise.all([
                this.prisma.devices.findMany({
                    where: whereClause,
                    skip,
                    take: limit,
                    orderBy: { updated_at: 'desc' }
                }),
                this.prisma.devices.count({ where: whereClause })
            ]);

            return {
                doors: doors.map(this.mapPrismaDeviceToDevice),
                total
            };
        }, `getUserDoors for ${accountId}`);
    }

    async sendDoorCommand(
        serialNumber: string,
        command: DoorCommandData,
        accountId: string
    ): Promise<void> {
        // Validate access first
        const door = await this.getDoorBySerial(serialNumber, accountId);
        if (!door) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy cửa');

        // Send command to /client namespace
        if (io) {
            const espCommand = {
                action: command.action,
                serialNumber: serialNumber,
                fromClient: accountId,
                esp01_safe: true,
                state: command.state || {},
                timestamp: new Date().toISOString()
            };

            console.log(`[DOOR] Sending direct command to ESP Hub for ${serialNumber}:`, espCommand);

            io.of('/client').to(`door:${serialNumber}`).emit('door_command', espCommand);
        }
    }

    async testDoor(
        serialNumber: string,
        testType: string,
        accountId: string
    ): Promise<{ success: boolean; message: string }> {
        const door = await this.getDoorBySerial(serialNumber, accountId);
        if (!door) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy cửa');

        if (io) {
            const testCommand = {
                action: "test_door",
                serialNumber: serialNumber,
                fromClient: accountId,
                esp01_safe: true,
                test_type: testType,
                timestamp: new Date().toISOString()
            };

            console.log(`[DOOR] Sending test command to ESP Hub for ${serialNumber}:`, testCommand);

            io.of('/client').to(`door:${serialNumber}`).emit('door_command', testCommand);
        }

        return {
            success: true,
            message: `Test command sent to door ${serialNumber}`
        };
    }

    async calibrateDoor(
        serialNumber: string,
        openAngle: number,
        closeAngle: number,
        accountId: string
    ): Promise<{ success: boolean; message: string }> {
        const door = await this.getDoorBySerial(serialNumber, accountId);
        if (!door) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy cửa');

        // Validate angles
        if (openAngle < 0 || openAngle > 180 || closeAngle < 0 || closeAngle > 180) {
            throwError(ErrorCodes.BAD_REQUEST, 'Servo angles must be between 0 and 180 degrees');
        }

        if (io) {
            const calibrateCommand = {
                action: "calibrate_door",
                serialNumber: serialNumber,
                fromClient: accountId,
                esp01_safe: true,
                open_angle: openAngle,
                close_angle: closeAngle,
                timestamp: new Date().toISOString()
            };

            console.log(`[DOOR] Sending calibration command to ESP Hub for ${serialNumber}:`, calibrateCommand);

            io.of('/client').to(`door:${serialNumber}`).emit('door_command', calibrateCommand);
        }

        return {
            success: true,
            message: `Calibration command sent to door ${serialNumber}`
        };
    }

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