// src/types/socket.ts
import { Socket } from 'socket.io';

/**
 * Device socket data interface - Enhanced for ESP8266
 */
export interface DeviceSocketData {
    deviceId: string;
    accountId?: string;
    isIoTDevice: boolean;
    isESP8266?: boolean;              // ESP8266 detection flag
    firmware_version?: string;        // ESP8266 firmware version
    hardware_info?: string;           // ESP8266 hardware information
}

/**
 * Device capabilities structure - Enhanced for ESP8266
 */
export interface DeviceCapabilities {
    deviceType?: string;
    category?: string;
    capabilities?: string[];
    hardware_version?: string;
    firmware_version?: string;
    isInput?: boolean;
    isOutput?: boolean;
    isSensor?: boolean;
    isActuator?: boolean;
    controls?: {
        [key: string]: string; // e.g., "power_status": "toggle", "brightness": "slider"
    };
    // ESP8266 specific capabilities
    esp8266_info?: {
        chip_id?: string;
        flash_size?: number;
        free_heap?: number;
        wifi_rssi?: number;
        sdk_version?: string;
    };
}

/**
 * Sensor data structure - Enhanced for ESP8266 Fire Alarm
 */
export interface SensorData {
    deviceId?: string;
    gas?: number;
    temperature?: number;
    humidity?: number;
    timestamp?: string;
    type?: string;
    // ESP8266 Fire Alarm specific sensors
    smoke_level?: number;             // Smoke concentration (0-1023)
    flame_detected?: boolean;         // Flame sensor state
    co_level?: number;               // Carbon monoxide level
    air_quality?: number;            // Air quality index
    // ESP8266 system status
    battery_level?: number;          // Battery percentage (0-100)
    wifi_rssi?: number;              // WiFi signal strength (dBm)
    uptime?: number;                 // Device uptime in seconds
    free_memory?: number;            // Available RAM in bytes
}

/**
 * ESP8266 Fire Alarm specific data structure
 */
export interface ESP8266FireAlarmData {
    device_id: string;
    alarm_type: 'smoke' | 'fire' | 'gas' | 'co' | 'test';
    severity: 'low' | 'medium' | 'high' | 'critical';
    smoke_level?: number;
    flame_detected?: boolean;
    temperature?: number;
    gas_level?: number;
    co_level?: number;
    location?: string;
    battery_level?: number;
    wifi_rssi?: number;
    timestamp: string;
}

/**
 * ESP8266 Status structure
 */
export interface ESP8266Status {
    deviceId: string;
    online: boolean;
    wifi_connected: boolean;
    wifi_rssi: number;
    ip_address?: string;
    free_heap: number;
    uptime: number;
    firmware_version: string;
    last_restart_reason?: string;
    sensor_status: {
        smoke_sensor: boolean;
        flame_sensor: boolean;
        temp_sensor: boolean;
        gas_sensor?: boolean;
    };
    timestamp: string;
}

/**
 * ESP8266 Configuration structure
 */
export interface ESP8266Config {
    smoke_threshold: number;          // Smoke detection threshold
    temp_threshold: number;           // Temperature alert threshold
    gas_threshold?: number;           // Gas detection threshold
    alarm_duration: number;           // Alarm duration in seconds
    wifi_check_interval: number;     // WiFi connection check interval
    sensor_read_interval: number;    // Sensor reading interval
    heartbeat_interval: number;      // Heartbeat interval
    auto_test_interval?: number;     // Auto test interval in hours
}

/**
 * Device status structure
 */
export interface DeviceStatus {
    deviceId: string;
    power_status?: boolean;
    color?: string;
    brightness?: number;
    alarmActive?: boolean;
    buzzerOverride?: boolean;
    timestamp: string;
    [key: string]: any; // For additional device-specific properties
}

/**
 * Alert data structure - Enhanced for ESP8266
 */
export interface AlertData {
    deviceId: string;
    alertType: number;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    sensorData?: SensorData;
    timestamp: string;
    // ESP8266 specific alert data
    alarm_source?: 'smoke' | 'flame' | 'temperature' | 'gas' | 'co' | 'system';
    location?: string;
    auto_resolved?: boolean;
}

/**
 * Command data structure - Enhanced for ESP8266
 */
export interface CommandData {
    action: string;
    state?: {
        power_status?: boolean;
        brightness?: number;
        color?: string;
        [key: string]: any;
    };
    deviceId?: string;
    fromClient?: string;
    timestamp?: string;
    // ESP8266 specific commands
    esp8266_command?: {
        type: 'reset_alarm' | 'test_alarm' | 'update_config' | 'restart' | 'calibrate';
        config?: ESP8266Config;
        test_duration?: number;
    };
    [key: string]: any;
}

/**
 * Command response structure
 */
export interface CommandResponse {
    success: boolean;
    result?: any;
    error?: string;
    deviceId?: string;
    commandId?: string;
    timestamp: string;
}

/**
 * Command status structure
 */
export interface CommandStatus {
    status: 'pending' | 'executing' | 'completed' | 'failed';
    progress?: number;
    deviceId?: string;
    commandId?: string;
    timestamp: string;
}

/**
 * Real-time device value structure
 */
export interface RealtimeDeviceValue {
    serial: string;
    data: {
        val: any;
        timestamp?: string;
    };
}

/**
 * ESP8266 Acknowledgment structure
 */
export interface ESP8266Acknowledgment {
    status: 'success' | 'error' | 'received';
    message?: string;
    timestamp: string;
    data?: any;
}

/**
 * Server to Client Events - Enhanced for ESP8266
 */
export interface ServerToClientEvents {
    // ================== DEVICE CONNECTION EVENTS ==================
    /**
     * Emitted when a device connects
     */
    device_connect: (data: { deviceId: string; deviceType?: string; timestamp?: string }) => void;

    /**
     * Emitted when a device disconnects
     */
    device_disconnect: (data: { deviceId: string; timestamp: string }) => void;

    /**
     * Emitted when a device comes online
     */
    device_online: (data: {
        deviceId: string;
        capabilities?: DeviceCapabilities;
        deviceType?: string;
        firmware_version?: string;
        hardware_info?: string;
        timestamp: string;
    }) => void;

    // ================== DEVICE CAPABILITIES EVENTS ==================
    /**
     * Emitted when device capabilities are updated
     */
    capabilities_updated: (data: {
        deviceId: string;
        capabilities: DeviceCapabilities;
        timestamp: string;
    }) => void;

    // ================== DATA EVENTS ==================
    /**
     * Emitted when sensor data is received
     */
    sensorData: (data: SensorData & { timestamp: string }) => void;

    /**
     * Emitted when device status changes
     */
    deviceStatus: (data: DeviceStatus) => void;

    /**
     * Emitted for real-time device value updates
     */
    realtime_device_value: (data: RealtimeDeviceValue) => void;

    // ================== ESP8266 SPECIFIC EVENTS ==================
    /**
     * Emitted when ESP8266 status is updated
     */
    esp8266_status: (data: ESP8266Status) => void;

    /**
     * Emitted when fire alarm is triggered
     */
    fire_alert: (data: ESP8266FireAlarmData) => void;

    /**
     * Emitted when smoke is detected
     */
    smoke_alert: (data: ESP8266FireAlarmData) => void;

    /**
     * Emitted for emergency alerts from ESP8266
     */
    emergency_alert: (data: {
        deviceId: string;
        type: 'fire_alarm' | 'smoke' | 'gas' | 'co' | 'system_error';
        severity: 'critical' | 'high' | 'medium' | 'low';
        data: ESP8266FireAlarmData;
        timestamp: string;
    }) => void;

    // ================== ALERT EVENTS ==================
    /**
     * Emitted when a device alert is triggered
     */
    device_alert: (data: AlertData) => void;

    /**
     * Emitted when an alarm alert occurs - Enhanced for ESP8266
     */
    alarmAlert: (data: {
        deviceId: string;
        alarmActive: boolean;
        temperature?: number;
        gasValue?: number;
        timestamp: string;
        // ESP8266 specific fields
        severity?: 'low' | 'medium' | 'high' | 'critical';
        alarm_type?: 'smoke' | 'fire' | 'gas' | 'co' | 'test';
        location?: string;
        smoke_level?: number;
        flame_detected?: boolean;
        [key: string]: any;
    }) => void;

    // ================== COMMAND EVENTS ==================
    /**
     * Emitted to send commands to devices
     */
    command: (data: CommandData) => void;

    /**
     * Emitted when a command response is received
     */
    command_response: (data: CommandResponse) => void;

    /**
     * Emitted when command execution status changes
     */
    command_status: (data: CommandStatus) => void;

    /**
     * Emitted to confirm command was sent
     */
    command_sent: (data: {
        success: boolean;
        deviceId: string;
        command: CommandData;
        timestamp: string;
    }) => void;

    // ================== ESP8266 COMMAND EVENTS ==================
    /**
     * Emitted to reset ESP8266 alarm
     */
    reset_alarm: (data: { deviceId: string; fromClient: string; timestamp: string }) => void;

    /**
     * Emitted to test ESP8266 alarm
     */
    test_alarm: (data: { deviceId: string; fromClient: string; timestamp: string }) => void;

    /**
     * Emitted to update ESP8266 configuration
     */
    update_config: (data: { config: ESP8266Config; fromClient: string; timestamp: string }) => void;

    /**
     * Emitted to confirm ESP8266 reset alarm sent
     */
    reset_alarm_sent: (data: { success: boolean; deviceId: string; timestamp: string }) => void;

    /**
     * Emitted to confirm ESP8266 test alarm sent
     */
    test_alarm_sent: (data: { success: boolean; deviceId: string; timestamp: string }) => void;

    /**
     * Emitted to confirm ESP8266 config update sent
     */
    config_update_sent: (data: { success: boolean; deviceId: string; configSize: number; timestamp: string }) => void;

    /**
     * Emitted when ESP8266 config error occurs
     */
    config_error: (data: { error: string; maxSize: number; currentSize: number }) => void;

    // ================== REAL-TIME MONITORING EVENTS ==================
    /**
     * Emitted to confirm real-time monitoring started
     */
    realtime_started: (data: {
        deviceId: string;
        status: 'started';
        timestamp: string;
    }) => void;

    /**
     * Emitted to confirm real-time monitoring stopped
     */
    realtime_stopped: (data: {
        deviceId: string;
        status: 'stopped';
        timestamp: string;
    }) => void;

    // ================== BUZZER EVENTS ==================
    /**
     * Emitted when buzzer status changes
     */
    buzzerStatus: (data: {
        deviceId: string;
        buzzerActive: boolean;
        timestamp: string;
    }) => void;

    // ================== ESP8266 ACKNOWLEDGMENT EVENTS ==================
    /**
     * Emitted to acknowledge sensor data receipt
     */
    sensor_ack: (data: ESP8266Acknowledgment) => void;

    /**
     * Emitted to acknowledge capabilities update
     */
    capabilities_ack: (data: ESP8266Acknowledgment) => void;

    /**
     * Emitted to acknowledge heartbeat
     */
    heartbeat_ack: (data: { received: boolean; timestamp: string }) => void;

    /**
     * Emitted for ESP8266 connection test
     */
    connection_test: (data: { test: boolean }) => void;

    // ================== CONNECTION MANAGEMENT ==================
    /**
     * Ping event for keep-alive
     */
    ping: () => void;

    /**
     * Pong response to ping
     */
    pong: (data?: { timestamp: string }) => void;

    /**
     * Error events
     */
    error: (data: { code: string; message: string }) => void;
}

/**
 * Client to Server Events - Enhanced for ESP8266
 */
export interface ClientToServerEvents {
    // ================== DEVICE LIFECYCLE EVENTS ==================
    /**
     * Sent when device comes online
     */
    device_online: (data?: DeviceCapabilities) => void;

    /**
     * Sent to update device capabilities
     */
    device_capabilities: (data: DeviceCapabilities) => void;

    // ================== DATA EVENTS ==================
    /**
     * Sent when device has sensor data
     */
    sensorData: (data: SensorData) => void;

    /**
     * Sent when device status changes
     */
    deviceStatus: (data: DeviceStatus) => void;

    /**
     * Sent when alarm alert occurs
     */
    alarmAlert: (data: {
        type: 'alarmAlert';
        deviceId: string;
        alarmActive: boolean;
        temperature?: number;
        gasValue?: number;
        timestamp: string;
        [key: string]: any;
    }) => void;

    /**
     * Sent when buzzer status changes
     */
    buzzerStatus: (data: {
        deviceId: string;
        buzzerActive: boolean;
        timestamp: string;
    }) => void;

    // ================== ESP8266 SPECIFIC EVENTS ==================
    /**
     * Sent when ESP8266 fire alarm is triggered
     */
    alarm_trigger: (data: ESP8266FireAlarmData) => void;

    /**
     * Sent when ESP8266 detects fire
     */
    fire_detected: (data: ESP8266FireAlarmData) => void;

    /**
     * Sent when ESP8266 detects smoke
     */
    smoke_detected: (data: ESP8266FireAlarmData) => void;

    /**
     * Sent for ESP8266 status updates
     */
    esp8266_status: (data: ESP8266Status) => void;

    /**
     * Sent for ESP8266 heartbeat
     */
    heartbeat: (data: { deviceId: string; uptime: number; free_heap: number; timestamp: string }) => void;

    // ================== COMMAND EVENTS ==================
    /**
     * Sent to execute a command on device
     */
    command: (data: CommandData) => void;

    /**
     * Sent as response to a command
     */
    command_response: (data: CommandResponse) => void;

    /**
     * Sent to update command execution status
     */
    command_status: (data: CommandStatus) => void;

    // ================== ESP8266 CLIENT COMMANDS ==================
    /**
     * Sent to reset ESP8266 alarm
     */
    reset_alarm: (data: { deviceId: string }) => void;

    /**
     * Sent to test ESP8266 alarm
     */
    test_alarm: (data: { deviceId: string }) => void;

    /**
     * Sent to update ESP8266 configuration
     */
    update_config: (data: ESP8266Config) => void;

    // ================== REAL-TIME MONITORING ==================
    /**
     * Sent to start real-time device monitoring
     */
    start_real_time_device: (data: { deviceId: string }) => void;

    /**
     * Sent to stop real-time device monitoring
     */
    stop_real_time_device: (data: { deviceId: string }) => void;

    // ================== CONNECTION MANAGEMENT ==================
    /**
     * Ping for keep-alive
     */
    ping: () => void;

    /**
     * Pong response
     */
    pong: () => void;

    /**
     * Connection errors
     */
    error: (error: any) => void;
    connect_error: (error: any) => void;
}

/**
 * Inter-server events for multi-server setups
 */
export interface InterServerEvents {
    /**
     * Inter-server ping
     */
    ping: () => void;

    /**
     * Inter-server pong
     */
    pong: () => void;

    /**
     * Broadcast device event across servers
     */
    broadcast_device_event: (data: {
        event: string;
        deviceId: string;
        data: any;
    }) => void;
}

/**
 * Device Socket type combining all interfaces
 */
export type DeviceSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    DeviceSocketData
>;

// ================== UTILITY TYPES ==================

/**
 * Socket room names
 */
export enum SocketRooms {
    DEVICE = 'device',
    DEVICE_REALTIME = 'device:realtime',
    USER = 'user',
    ADMIN = 'admin',
    ESP8266 = 'esp8266'
}

/**
 * Device connection states
 */
export enum DeviceConnectionState {
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected',
    RECONNECTING = 'reconnecting',
    ERROR = 'error'
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * ESP8266 Alarm Types
 */
export enum ESP8266AlarmType {
    SMOKE = 'smoke',
    FIRE = 'fire',
    GAS = 'gas',
    CO = 'co',
    TEMPERATURE = 'temperature',
    SYSTEM_ERROR = 'system_error',
    TEST = 'test'
}

/**
 * Command execution states
 */
export enum CommandExecutionState {
    PENDING = 'pending',
    EXECUTING = 'executing',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

// ================== TYPE GUARDS ==================

/**
 * Type guard for checking if data is DeviceCapabilities
 */
export function isDeviceCapabilities(data: any): data is DeviceCapabilities {
    return data &&
        typeof data === 'object' &&
        (data.deviceType !== undefined || data.capabilities !== undefined);
}

/**
 * Type guard for checking if data is SensorData
 */
export function isSensorData(data: any): data is SensorData {
    return data &&
        typeof data === 'object' &&
        (data.gas !== undefined || data.temperature !== undefined || data.humidity !== undefined);
}

/**
 * Type guard for checking if data is ESP8266 sensor data
 */
export function isESP8266SensorData(data: any): data is SensorData {
    return isSensorData(data) &&
        (data.smoke_level !== undefined || data.flame_detected !== undefined || data.battery_level !== undefined);
}

/**
 * Type guard for checking if data is ESP8266 Fire Alarm data
 */
export function isESP8266FireAlarmData(data: any): data is ESP8266FireAlarmData {
    return data &&
        typeof data === 'object' &&
        typeof data.device_id === 'string' &&
        typeof data.alarm_type === 'string' &&
        ['smoke', 'fire', 'gas', 'co', 'test'].includes(data.alarm_type);
}

/**
 * Type guard for checking if data is CommandData
 */
export function isCommandData(data: any): data is CommandData {
    return data &&
        typeof data === 'object' &&
        typeof data.action === 'string';
}

/**
 * Type guard for checking if data is ESP8266 command
 */
export function isESP8266Command(data: any): data is CommandData {
    return isCommandData(data) &&
        data.esp8266_command !== undefined &&
        typeof data.esp8266_command === 'object';
}