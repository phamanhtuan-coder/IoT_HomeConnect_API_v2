// src/types/socket.ts
import { Socket } from 'socket.io';

/**
 * Device socket data interface
 */
export interface DeviceSocketData {
    deviceId: string;
    accountId?: string;
    isIoTDevice: boolean;
}

/**
 * Device capabilities structure
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
}

/**
 * Sensor data structure
 */
export interface SensorData {
    deviceId?: string;
    gas?: number;
    temperature?: number;
    humidity?: number;
    timestamp?: string;
    type?: string;
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
 * Alert data structure
 */
export interface AlertData {
    deviceId: string;
    alertType: number;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    sensorData?: SensorData;
    timestamp: string;
}

/**
 * Command data structure
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
 * Server to Client Events
 */
export interface ServerToClientEvents {
    // ================== DEVICE CONNECTION EVENTS ==================
    /**
     * Emitted when a device connects
     */
    device_connect: (data: { deviceId: string; timestamp?: string }) => void;

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

    // ================== ALERT EVENTS ==================
    /**
     * Emitted when a device alert is triggered
     */
    device_alert: (data: AlertData) => void;

    /**
     * Emitted when an alarm alert occurs
     */
    alarmAlert: (data: {
        deviceId: string;
        alarmActive: boolean;
        temperature?: number;
        gasValue?: number;
        timestamp: string;
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

    // ================== CONNECTION MANAGEMENT ==================
    /**
     * Ping event for keep-alive
     */
    ping: () => void;

    /**
     * Pong response to ping
     */
    pong: () => void;
}

/**
 * Client to Server Events
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
    ADMIN = 'admin'
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
 * Type guard for checking if data is CommandData
 */
export function isCommandData(data: any): data is CommandData {
    return data &&
        typeof data === 'object' &&
        typeof data.action === 'string';
}