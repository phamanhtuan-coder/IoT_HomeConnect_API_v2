// src/controllers/door.controller.ts
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
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Người dùng chưa xác thực');

        try {
            const { serialNumber } = req.params;
            const { power_status = true, force = false, timeout = 5000 }: DoorToggleRequest = req.body;

            const door = await this.doorService.toggleDoor(serialNumber, power_status, accountId, force, timeout);

            res.json({
                success: true,
                door,
                action: power_status ? 'OPEN' : 'CLOSE',
                message: `Lệnh ${power_status ? 'mở' : 'đóng'} cửa đã được gửi thành công`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    getDoorStatus = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Người dùng chưa xác thực');

        try {
            const { serialNumber } = req.params;
            const door = await this.doorService.getDoorBySerial(serialNumber, accountId);
            if (!door) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy cửa');

            const doorState = (door?.attribute as Record<string, any>) || {};
            res.json({
                success: true,
                door_state: {
                    door_state: doorState.door_state || DoorState.CLOSED,
                    is_moving: doorState.is_moving || false,
                    servo_angle: doorState.servo_angle || 0
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    updateDoorConfig = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Người dùng chưa xác thực');

        try {
            const { serialNumber } = req.params;
            const { config }: DoorConfigUpdateRequest = req.body;

            const updatedDoor = await this.doorService.updateDoorConfig(serialNumber, config, accountId);

            res.json({
                success: true,
                door: updatedDoor,
                message: 'Cấu hình cửa đã được cập nhật thành công',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    emergencyDoorOperation = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Người dùng chưa xác thực');

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
                message: `Thao tác khẩn cấp ${action} đã hoàn tất`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    getUserDoors = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Người dùng chưa xác thực');

        try {
            const filters = {
                state: req.query.state as DoorState,
                is_moving: req.query.is_moving === 'true',
                has_errors: req.query.has_errors === 'true'
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
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Người dùng chưa xác thực');

        try {
            const { door_serial_numbers, action, state = { power_status: true }, priority = DoorPriority.NORMAL }: DoorBulkOperationRequest = req.body;

            interface DoorOperationResult {
                serialNumber: string;
                success: boolean;
                door: any;  // Replace 'any' with actual Device type if available
            }

            interface DoorOperationError {
                serialNumber: string;
                error: string;
            }

            const results: DoorOperationResult[] = [];
            const errors: DoorOperationError[] = [];

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

    calibrateDoor = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Người dùng chưa xác thực');

        try {
            const { serialNumber } = req.params;
            const { angles, save_to_eeprom = true } = req.body;

            const door = await this.doorService.getDoorBySerial(serialNumber, accountId);
            if (!door) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy cửa');

            if (this.io) {
                this.io.of("/door").to(`door:${serialNumber}`).emit('calibrate', {
                    serialNumber,
                    angles,
                    save_to_eeprom,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                message: 'Lệnh hiệu chỉnh đã được gửi',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };

    testDoor = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Người dùng chưa xác thực');

        try {
            const { serialNumber } = req.params;
            const { test_type = 'movement', repeat_count = 1 } = req.body;

            const door = await this.doorService.getDoorBySerial(serialNumber, accountId);
            if (!door) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy cửa');

            if (this.io) {
                this.io.of("/door").to(`door:${serialNumber}`).emit('test', {
                    serialNumber,
                    test_type,
                    repeat_count,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                message: `Lệnh kiểm tra cửa (${test_type}) đã được gửi`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };


    performMaintenance = async (req: Request, res: Response, next: NextFunction) => {
        const accountId = req.user?.userId || req.user?.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Người dùng chưa xác thực');

        try {
            const { serialNumber } = req.params;
            const { maintenance_type, notify_completion = true } = req.body;

            const door = await this.doorService.getDoorBySerial(serialNumber, accountId);
            if (!door) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy cửa');

            if (this.io) {
                this.io.of("/door").to(`door:${serialNumber}`).emit('maintenance', {
                    serialNumber,
                    maintenance_type,
                    notify_completion,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                message: `Lệnh bảo trì (${maintenance_type}) đã được gửi`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            next(error);
        }
    };
}