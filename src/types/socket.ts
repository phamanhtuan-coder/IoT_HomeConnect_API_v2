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
        [key: string]: string; // e.g., "power": "toggle", "brightness": "slider"
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
    power?: boolean;
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
 * Server to Client Events
 */
export interface ServerToClientEvents {
    // Device connection events
    device_connect: (data: { deviceId: string }) => void;
    device_disconnect: (data: { deviceId: string; timestamp: string }) => void;
    device_online: (data: {
        deviceId: string;
        capabilities?: DeviceCapabilities;
        timestamp: string
    }) => void;

    // Device capabilities events
    capabilities_updated: (data: {
        deviceId: string;
        capabilities: DeviceCapabilities;
        timestamp: string
    }) => void;

    // Sensor and status events
    sensorData: (data: SensorData) => void;
    deviceStatus: (data: DeviceStatus) => void;
    realtime_device_value: (data: {
        serial: string;
        data: { val: any }
    }) => void;

    // Alert events
    device_alert: (data: AlertData) => void;
    alarmAlert: (data: {
        deviceId: string;
        alarmActive: boolean;
        temperature?: number;
        gasValue?: number;
        timestamp: string;
    }) => void;

    // Command events
    command: (data: {
        action: string;
        [key: string]: any
    }) => void;

    // Buzzer events
    buzzerStatus: (data: {
        deviceId: string;
        buzzerActive: boolean;
        timestamp: string;
    }) => void;

    // Connection management
    ping: () => void;
    pong: () => void;
}

/**
 * Client to Server Events
 */
export interface ClientToServerEvents {
    // Device lifecycle events
    device_online: (data?: DeviceCapabilities) => void;
    device_capabilities: (data: DeviceCapabilities) => void;

    // Data events
    sensorData: (data: SensorData) => void;
    deviceStatus: (data: DeviceStatus) => void;
    alarmAlert: (data: any) => void;
    buzzerStatus: (data: any) => void;

    // Connection management
    ping: () => void;
    pong: () => void;

    // Real-time monitoring
    start_real_time_device: (data: { deviceId: string }) => void;
    stop_real_time_device: (data: { deviceId: string }) => void;
}

/**
 * Inter-server events
 */
export interface InterServerEvents {
    ping: () => void;
    pong: () => void;
}

/**
 * Device Socket type
 */
export type DeviceSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    DeviceSocketData
>;