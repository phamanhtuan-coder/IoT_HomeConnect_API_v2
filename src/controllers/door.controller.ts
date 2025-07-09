// src/controllers/door.controller.ts - Enhanced for all door types
import { Request, Response, NextFunction } from 'express';
import { DoorService } from '../services/door.service';
import { throwError, ErrorCodes } from '../utils/errors';
import {
    DoorToggleRequest,
    DoorConfigUpdateRequest,
    DoorEmergencyRequest,
    DoorBulkOperationRequest,
    EmergencyDoorOperation,
    DoorState, DoorPriority
} from '../types/door.types';
import { Server } from 'socket.io';

export class DoorController {
    private doorService: DoorService;
    private io: Server | null = null;

    constructor() {
        this.doorService = new DoorService();
    }

    toggleDoor = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const { power_status = true, force = false, timeout = 5000 }: DoorToggleRequest = req.body;

            const door = await this.doorService.toggleDoor(serialNumber, power_status, accountId, force, timeout);

            res.json({
                success: true,
                door,
                action: power_status ? 'OPEN' : 'CLOSE',
                message: `Door ${power_status ? 'open' : 'close'} command sent`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    getDoorStatus = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const door = await this.doorService.getDoorBySerial(serialNumber, accountId);
            if (!door) throwError(ErrorCodes.NOT_FOUND, 'Door not found');

            const doorState = (door?.attribute as Record<string, any>) || {};
            const doorType = doorState.runtime_capabilities?.door_type || "SERVO";

            res.json({
                success: true,
                door_state: {
                    door_state: doorState.door_state || DoorState.CLOSED,
                    door_type: doorType,
                    is_moving: doorState.is_moving || false,
                    servo_angle: doorState.servo_angle || 0,
                    current_rounds: doorState.current_rounds || 0,
                    pir_enabled: doorState.config?.pir_enabled || false
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    updateDoorConfig = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const { config }: DoorConfigUpdateRequest = req.body;

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

    // NEW: Configure door based on type
    configureDoor = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const config = req.body;

            const result = await this.doorService.configureDoor(serialNumber, config, accountId);

            res.json({
                success: result.success,
                message: result.message,
                config,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    // NEW: Toggle PIR for sliding doors
    togglePIR = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;

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

    // NEW: Get door capabilities
    getDoorCapabilities = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const door = await this.doorService.getDoorBySerial(serialNumber, accountId);
            if (!door) throwError(ErrorCodes.NOT_FOUND, 'Door not found');

            const doorState = (door?.attribute as Record<string, any>) || {};
            const doorType = doorState.runtime_capabilities?.door_type || "SERVO";

            let capabilities;
            if (doorType === "SERVO") {
                capabilities = {
                    door_type: "SERVO",
                    configurable: ["servo_open_angle", "servo_close_angle"],
                    angle_range: { min: 0, max: 180 },
                    features: ["position_control", "angle_feedback", "eeprom_storage"]
                };
            } else if (doorType === "ROLLING") {
                capabilities = {
                    door_type: "ROLLING",
                    configurable: ["open_rounds", "closed_rounds"],
                    rounds_range: { min: 1, max: 10 },
                    features: ["rounds_control", "rfid_access", "manual_buttons", "eeprom_storage"]
                };
            } else if (doorType === "SLIDING") {
                capabilities = {
                    door_type: "SLIDING",
                    configurable: ["open_rounds", "closed_rounds", "pir_enabled"],
                    rounds_range: { min: 1, max: 10 },
                    features: ["rounds_control", "pir_motion_detection", "auto_close", "manual_button", "eeprom_storage"]
                };
            }

            res.json({
                success: true,
                serialNumber,
                capabilities,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    emergencyDoorOperation = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { door_serial_numbers, action, override_manual = true }: DoorEmergencyRequest = req.body;

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

    getUserDoors = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const filters = {
                state: req.query.state as DoorState,
                is_moving: req.query.is_moving === 'true',
                has_errors: req.query.has_errors === 'true',
                door_type: req.query.door_type as string
            };

            const doors = await this.doorService.getUserDoors(accountId, filters);

            res.json({
                success: true,
                doors,
                filters,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    bulkDoorOperation = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { door_serial_numbers, action, state = { power_status: true }, priority = DoorPriority.NORMAL }: DoorBulkOperationRequest = req.body;

            const results: any[] = [];
            const errors: any[] = [];

            for (const serialNumber of door_serial_numbers) {
                try {
                    const door = await this.doorService.toggleDoor(
                        serialNumber,
                        state.power_status ?? true,
                        accountId,
                        priority === 'emergency',
                        priority === 'emergency' ? 10000 : 5000
                    );
                    results.push({ serialNumber, success: true, door });
                } catch (error: any) {
                    errors.push({ serialNumber, error: error.message });
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

    // Enhanced calibration for all door types
    calibrateDoor = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const calibrationData = req.body;

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

    testDoor = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const { test_type = 'movement', repeat_count = 1 } = req.body;

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

    performMaintenance = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

        try {
            const { serialNumber } = req.params;
            const { maintenance_type, notify_completion = true } = req.body;

            const door = await this.doorService.getDoorBySerial(serialNumber, accountId);
            if (!door) throwError(ErrorCodes.NOT_FOUND, 'Door not found');

            if (this.io) {
                this.io.of("/client").to(`door:${serialNumber}`).emit('door_command', {
                    action: 'maintenance',
                    serialNumber,
                    maintenance_type,
                    notify_completion,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                });
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
}