// src/types/door.types.ts

/**
 * Door state enumeration
 */
export enum DoorState {
    CLOSED = 'closed',
    OPENING = 'opening',
    OPEN = 'open',
    CLOSING = 'closing',
    ERROR = 'error',
    MAINTENANCE = 'maintenance'
}

/**
 * Door action types
 */
export enum DoorAction {
    TOGGLE = 'toggle_door',
    OPEN = 'open_door',
    CLOSE = 'close_door',
    EMERGENCY_OPEN = 'emergency_open',
    CALIBRATE = 'calibrate_door',
    TEST = 'test_door',
    STOP = 'stop_door'
}

/**
 * Door priority levels
 */
export enum DoorPriority {
    NORMAL = 'normal',
    HIGH = 'high',
    EMERGENCY = 'emergency',
    MAINTENANCE = 'maintenance'
}

/**
 * Door sensor data structure
 */
export interface DoorSensorData {
    serialNumber: string;
    door_state: DoorState;
    servo_angle: number;
    is_moving: boolean;
    last_action: string;
    movement_duration?: number;
    obstacle_detected?: boolean;
    manual_override?: boolean;
    battery_level?: number;
    signal_strength?: number;
    timestamp: string;
}

/**
 * Door command data structure
 */
export interface DoorCommandData {
    action: DoorAction;
    state?: {
        power_status?: boolean;
        target_angle?: number;
        speed?: number;
    };
    priority?: DoorPriority;
    timeout?: number;
    force?: boolean;
    fromClient?: string;
    fromSystem?: string;
    timestamp: string;
}

/**
 * Door status response
 */
export interface DoorStatusResponse {
    serialNumber: string;
    current_state: DoorState;
    target_state?: DoorState;
    servo_angle: number;
    is_moving: boolean;
    last_command: string;
    uptime: number;
    free_memory: number;
    error_count: number;
    timestamp: string;
}

/**
 * Door configuration structure
 */
export interface DoorConfig {
    servo_open_angle: number;
    servo_close_angle: number;
    movement_duration: number;
    auto_close_delay?: number;
    obstacle_detection: boolean;
    manual_override_enabled: boolean;
    emergency_mode: boolean;
    max_retry_attempts: number;
}

/**
 * Door capabilities
 */
export interface DoorCapabilities {
    deviceType: 'DOOR_CONTROLLER_ESP01S';
    category: 'ACCESS_CONTROL';
    capabilities: string[];
    servo_range: { min: number; max: number };
    supports_obstacle_detection: boolean;
    supports_manual_override: boolean;
    supports_emergency_mode: boolean;
    firmware_version: string;
}

/**
 * Emergency door operation
 */
export interface EmergencyDoorOperation {
    trigger_source: 'fire_alarm' | 'security_alert' | 'manual' | 'system' | 'fire';
    affected_doors: string[];
    action: 'open_all' | 'close_all' | 'selective';
    override_manual: boolean;
    emergency_type?: 'fire' | 'security' | 'maintenance' | 'other';
    timestamp: string;
}

/**
 * Door maintenance data
 */
export interface DoorMaintenanceData {
    serialNumber: string;
    operation_count: number;
    last_maintenance: string;
    servo_health: 'good' | 'warning' | 'critical';
    calibration_status: 'ok' | 'required';
    error_history: Array<{
        error: string;
        timestamp: string;
        resolved: boolean;
    }>;
}

/**
 * Door event types for socket communication
 */
export interface DoorSocketEvents {
    // Server to ESP-01S events
    door_command: (data: DoorCommandData) => void;
    door_config_update: (data: { config: DoorConfig; serialNumber: string }) => void;
    door_emergency: (data: EmergencyDoorOperation) => void;
    door_calibrate: (data: { serialNumber: string; angles?: { open: number; close: number } }) => void;
    door_test: (data: { serialNumber: string; test_type: 'movement' | 'obstacle' | 'full' }) => void;

    // ESP-01S to Server events
    door_status: (data: DoorStatusResponse) => void;
    door_sensor_data: (data: DoorSensorData) => void;
    door_error: (data: { serialNumber: string; error: string; code: number; timestamp: string }) => void;
    door_maintenance_alert: (data: DoorMaintenanceData) => void;
    door_command_response: (data: {
        success: boolean;
        serialNumber: string;
        command: string;
        result?: any;
        error?: string;
        timestamp: string
    }) => void;
}

/**
 * Door validation schemas data types
 */
export interface DoorToggleRequest {
    power_status?: boolean;
    force?: boolean;
    timeout?: number;
}

export interface DoorConfigUpdateRequest {
    config: Partial<DoorConfig>;
}

export interface DoorEmergencyRequest {
    door_serial_numbers: string[];
    action: 'open' | 'close';
    override_manual?: boolean;
}

export interface DoorBulkOperationRequest {
    door_serial_numbers: string[];
    action: DoorAction;
    state?: {
        power_status?: boolean;
        target_angle?: number;
    };
    priority?: DoorPriority;
}