// src/controllers/door.controller.ts - ENHANCED FOR ALL DOOR TYPES
import { Request, Response, NextFunction } from 'express';
import { DoorService } from '../services/door.service';
import { throwError, ErrorCodes } from '../utils/errors';
import {
    DoorToggleRequest,
    DoorConfigUpdateRequest,
    DoorEmergencyRequest,
    DoorBulkOperationRequest,
    EmergencyDoorOperation,
    DoorState,
    DoorPriority
} from '../types/door.types';
import { Server } from 'socket.io';

export class DoorController {
    private doorService: DoorService;
    private io: Server | null = null;

    constructor() {
        this.doorService = new DoorService();
    }

    setSocketInstance(io: Server) {
        this.io = io;
    }

    /**
     * ✅ ENHANCED: Toggle door with door type detection
     */
    toggleDoor = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const { power_status = true, force = false, timeout = 5000 }: DoorToggleRequest = req.body;

            console.log(`[DOOR_CONTROLLER] Toggle door ${serialNumber}: ${power_status ? 'OPEN' : 'CLOSE'}`);

            const door = await this.doorService.toggleDoor(serialNumber, power_status, accountId, force, timeout);

            const doorAttribute = (door?.attribute as Record<string, any>) || {};
            const doorType = doorAttribute.door_type || "SERVO";

            res.json({
                success: true,
                door,
                door_type: doorType,
                action: power_status ? 'OPEN' : 'CLOSE',
                message: `${doorType} door ${power_status ? 'open' : 'close'} command sent`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * ✅ ENHANCED: Get door status with door type info
     */
    getDoorStatus = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const door = await this.doorService.getDoorBySerial(serialNumber, accountId);
            if (!door) throwError(ErrorCodes.NOT_FOUND, 'Door not found');

            const doorState = (door?.attribute as Record<string, any>) || {};
            const doorType = doorState.door_type || "SERVO";

            // ✅ BUILD RESPONSE BASED ON DOOR TYPE
            let statusResponse: any = {
                door_state: doorState.door_state || DoorState.CLOSED,
                door_type: doorType,
                is_moving: doorState.is_moving || false,
                online: doorState.link_status === 'linked',
                last_seen: doorState.last_seen
            };

            if (doorType === "SERVO") {
                statusResponse.servo_angle = doorState.servo_angle || 0;
                statusResponse.config = {
                    open_angle: doorState.config?.open_angle || 90,
                    close_angle: doorState.config?.close_angle || 0
                };
            } else if (doorType === "ROLLING") {
                statusResponse.current_rounds = doorState.current_rounds || 0;
                statusResponse.config = {
                    open_rounds: doorState.config?.open_rounds || 2,
                    closed_rounds: doorState.config?.closed_rounds || 0,
                    motor_speed: doorState.config?.motor_speed || 10
                };
            } else if (doorType === "SLIDING") {
                statusResponse.auto_mode = doorState.config?.auto_mode || true;
                statusResponse.pir_sensors = {
                    pir1_state: doorState.pir1_state || false,
                    pir2_state: doorState.pir2_state || false,
                    pir1_enabled: doorState.config?.pir1_enabled || true,
                    pir2_enabled: doorState.config?.pir2_enabled || true
                };
                statusResponse.config = {
                    motor_speed: doorState.config?.motor_speed || 80,
                    open_duration: doorState.config?.open_duration || 2000,
                    wait_before_close: doorState.config?.wait_before_close || 4000
                };
            }

            res.json({
                success: true,
                door_status: statusResponse,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * ✅ NEW: Configure door based on type
     */
    configureDoor = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const config = req.body;

            console.log(`[DOOR_CONTROLLER] Configure door ${serialNumber}:`, config);

            const result = await this.doorService.configureDoor(serialNumber, config, accountId);

            res.json({
                success: result.success,
                message: result.message,
                config_sent: config,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * ✅ NEW: Toggle PIR for sliding doors
     */
    togglePIR = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;

            console.log(`[DOOR_CONTROLLER] Toggle PIR for sliding door ${serialNumber}`);

            const result = await this.doorService.togglePIR(serialNumber, accountId);

            res.json({
                success: result.success,
                message: result.message,
                pir_enabled: result.pir_enabled,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * ✅ ENHANCED: Get door capabilities based on type
     */
    getDoorCapabilities = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const door = await this.doorService.getDoorBySerial(serialNumber, accountId);
            if (!door) throwError(ErrorCodes.NOT_FOUND, 'Door not found');

            const doorState = (door?.attribute as Record<string, any>) || {};
            const doorType = doorState.door_type || "SERVO";

            let capabilities: any = {
                door_type: doorType,
                serial_number: serialNumber,
                firmware_version: doorState.firmware_version,
                connection_type: door?.hub_id ? "hub_managed" : "direct"
            };

            // ✅ TYPE-SPECIFIC CAPABILITIES
            if (doorType === "SERVO") {
                capabilities = {
                    ...capabilities,
                    configurable_parameters: ["open_angle", "close_angle", "movement_speed"],
                    angle_range: { min: 0, max: 180 },
                    features: ["position_control", "angle_feedback", "eeprom_storage"],
                    control_methods: ["remote", "manual_override"],
                    safety_features: ["position_feedback", "stall_detection"]
                };
            } else if (doorType === "ROLLING") {
                capabilities = {
                    ...capabilities,
                    configurable_parameters: ["open_rounds", "closed_rounds", "motor_speed"],
                    rounds_range: { min: 1, max: 10 },
                    speed_range: { min: 5, max: 50 },
                    features: ["rounds_control", "rfid_access", "manual_buttons", "eeprom_storage"],
                    control_methods: ["remote", "rfid", "manual_buttons"],
                    safety_features: ["manual_override", "stall_protection"],
                    supported_rfid_tags: 6
                };
            } else if (doorType === "SLIDING") {
                capabilities = {
                    ...capabilities,
                    configurable_parameters: ["motor_speed", "open_duration", "wait_before_close", "auto_mode", "pir_settings"],
                    speed_range: { min: 50, max: 255 },
                    duration_range: { min: 500, max: 10000 },
                    features: ["motion_detection", "auto_operation", "manual_override", "safety_reverse"],
                    control_methods: ["remote", "pir_sensors", "manual_button"],
                    safety_features: ["motion_detection_during_close", "automatic_reverse", "timeout_protection"],
                    sensors: {
                        pir1: "motion_detection",
                        pir2: "motion_detection"
                    }
                };
            }

            res.json({
                success: true,
                capabilities,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * ✅ ENHANCED: Update door config with validation
     */
    updateDoorConfig = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const { config }: DoorConfigUpdateRequest = req.body;

            console.log(`[DOOR_CONTROLLER] Update config for door ${serialNumber}:`, config);

            const updatedDoor = await this.doorService.updateDoorConfig(serialNumber, config, accountId);

            res.json({
                success: true,
                door: updatedDoor,
                message: 'Door configuration updated',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * ✅ ENHANCED: Emergency operations with door type support
     */
    emergencyDoorOperation = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { door_serial_numbers, action, override_manual = true }: DoorEmergencyRequest = req.body;

            console.log(`[DOOR_CONTROLLER] Emergency operation: ${action} for ${door_serial_numbers.length} doors`);

            const emergencyOperation: EmergencyDoorOperation = {
                trigger_source: 'manual',
                affected_doors: door_serial_numbers,
                action: action === 'open' ? 'open_all' : 'close_all',
                override_manual,
                timestamp: new Date().toISOString()
            };

            const result = await this.doorService.executeEmergencyDoorOperation(emergencyOperation, accountId);

            res.json({
                success: result.success,
                affected_doors: result.affected_doors,
                errors: result.errors,
                message: `Emergency ${action} operation completed`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * ✅ ENHANCED: Get user doors with door type filter
     */
    getUserDoors = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const filters = {
                state: req.query.state as DoorState,
                is_moving: req.query.is_moving === 'true',
                has_errors: req.query.has_errors === 'true',
                door_type: req.query.door_type as string, // ✅ NEW: Filter by door type
                connection_type: req.query.connection_type as string // ✅ NEW: Filter by connection type
            };

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;

            console.log(`[DOOR_CONTROLLER] Get user doors with filters:`, filters);

            const result = await this.doorService.getUserDoors(accountId, filters, page, limit);

            // ✅ ADD DOOR TYPE STATISTICS
            const doorStats = result.doors.reduce((stats: any, door: any) => {
                const doorType = (door.attribute as any)?.door_type || "SERVO";
                stats[doorType] = (stats[doorType] || 0) + 1;
                return stats;
            }, {});

            res.json({
                success: true,
                doors: result.doors,
                total: result.total,
                page,
                limit,
                door_type_stats: doorStats,
                filters,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * ✅ ENHANCED: Bulk operations with door type support
     */
    bulkDoorOperation = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { door_serial_numbers, action, state = { power_status: true }, priority = DoorPriority.NORMAL }: DoorBulkOperationRequest = req.body;

            console.log(`[DOOR_CONTROLLER] Bulk operation: ${action} for ${door_serial_numbers.length} doors`);

            const results: any[] = [];
            const errors: any[] = [];

            // ✅ PROCESS IN SMALLER BATCHES FOR RELIABILITY
            const batchSize = 5;
            for (let i = 0; i < door_serial_numbers.length; i += batchSize) {
                const batch = door_serial_numbers.slice(i, i + batchSize);

                await Promise.allSettled(
                    batch.map(async (serialNumber) => {
                        try {
                            const door = await this.doorService.toggleDoor(
                                serialNumber,
                                state.power_status ?? true,
                                accountId,
                                priority === 'emergency',
                                priority === 'emergency' ? 10000 : 5000
                            );

                            const doorType = (door.attribute as any)?.door_type || "SERVO";
                            results.push({
                                serialNumber,
                                success: true,
                                door_type: doorType,
                                door
                            });
                        } catch (error: any) {
                            errors.push({
                                serialNumber,
                                error: error.message
                            });
                        }
                    })
                );

                // Small delay between batches
                if (i + batchSize < door_serial_numbers.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            res.json({
                success: errors.length === 0,
                results,
                errors,
                total_processed: door_serial_numbers.length,
                successful: results.length,
                failed: errors.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * ✅ ENHANCED: Calibration for all door types
     */
    calibrateDoor = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const calibrationData = req.body;

            console.log(`[DOOR_CONTROLLER] Calibrate door ${serialNumber}:`, calibrationData);

            const result = await this.doorService.calibrateDoor(serialNumber, calibrationData, accountId);

            res.json({
                success: result.success,
                message: result.message,
                calibration_data: calibrationData,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * ✅ NEW: Test door functionality
     */
    testDoor = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const { test_type = 'movement', repeat_count = 1 } = req.body;

            console.log(`[DOOR_CONTROLLER] Test door ${serialNumber}: ${test_type} (${repeat_count}x)`);

            const result = await this.doorService.testDoor(serialNumber, test_type, accountId);

            res.json({
                success: result.success,
                message: result.message,
                test_type,
                repeat_count,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * ✅ NEW: Maintenance operations
     */
    performMaintenance = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const { maintenance_type, notify_completion = true } = req.body;

            console.log(`[DOOR_CONTROLLER] Maintenance for door ${serialNumber}: ${maintenance_type}`);

            const door = await this.doorService.getDoorBySerial(serialNumber, accountId);
            if (!door) throwError(ErrorCodes.NOT_FOUND, 'Door not found');

            // ✅ SEND MAINTENANCE COMMAND VIA SOCKET
            if (this.io) {
                const doorType = (door?.attribute as any)?.door_type || "SERVO";
                const command = {
                    action: 'maintenance',
                    serialNumber,
                    maintenance_type,
                    notify_completion,
                    door_type: doorType,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                };

                if (door?.hub_id) {
                    // Route through hub
                    this.io.to(`hub:${door?.hub_id}`).emit('command', command);
                } else {
                    // Direct connection
                    this.io.to(`device:${serialNumber}`).emit('command', command);
                }
            }

            res.json({
                success: true,
                message: `Maintenance command (${maintenance_type}) sent`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * ✅ NEW: Get door type statistics
     */
    getDoorTypeStats = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            console.log(`[DOOR_CONTROLLER] Get door type statistics for user ${accountId}`);

            const result = await this.doorService.getUserDoors(accountId, {}, 1, 1000);

            const stats = result.doors.reduce((stats: any, door: any) => {
                const doorType = (door.attribute as any)?.door_type || "SERVO";
                const connectionType = door.hub_id ? "hub_managed" : "direct";
                const isOnline = door.link_status === 'linked';

                if (!stats[doorType]) {
                    stats[doorType] = {
                        total: 0,
                        online: 0,
                        offline: 0,
                        hub_managed: 0,
                        direct_connected: 0
                    };
                }

                stats[doorType].total++;
                if (isOnline) {
                    stats[doorType].online++;
                } else {
                    stats[doorType].offline++;
                }

                if (connectionType === "hub_managed") {
                    stats[doorType].hub_managed++;
                } else {
                    stats[doorType].direct_connected++;
                }

                return stats;
            }, {});

            res.json({
                success: true,
                door_type_statistics: stats,
                total_doors: result.total,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };
}