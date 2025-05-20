import { Socket } from 'socket.io';

/**
 * Dữ liệu socket cho thiết bị.
 * @property deviceId - ID của thiết bị.
 * @property accountId - ID tài khoản (tùy chọn).
 * @property isIoTDevice - Thiết bị có phải IoT không.
 */
export interface DeviceSocketData {
    deviceId: string;
    accountId?: string;
    isIoTDevice: boolean;
}

/**
 * Các sự kiện server gửi tới client.
 */
export interface ServerToClientEvents {
    /**
     * Sự kiện khi thiết bị kết nối.
     * @param data - Thông tin thiết bị.
     */
    device_connect: (data: { deviceId: string }) => void;
    /**
     * Sự kiện khi thiết bị ngắt kết nối.
     * @param data - Thông tin thiết bị.
     */
    device_disconnect: (data: { deviceId: string }) => void;
    /**
     * Sự kiện khi thiết bị online.
     * @param data - Thông tin thiết bị.
     */
    device_online: (data: { deviceId: string }) => void;
    /**
     * Sự kiện gửi dữ liệu cảm biến.
     * @param data - Dữ liệu cảm biến.
     */
    sensorData: (data: { deviceId: string; gas?: number; temperature?: number; humidity?: number }) => void;
    /**
     * Sự kiện gửi lệnh tới thiết bị.
     * @param data - Dữ liệu lệnh.
     */
    command: (data: { action: string; [key: string]: any }) => void;
    /**
     * Sự kiện gửi giá trị thiết bị theo thời gian thực.
     * @param data - Dữ liệu giá trị thiết bị.
     */
    realtime_device_value: (data: { serial: string; data: { val: any } }) => void;
}

/**
 * Các sự kiện client gửi tới server.
 */
export interface ClientToServerEvents {
    /**
     * Thông báo thiết bị online.
     */
    device_online: () => void;
    /**
     * Gửi dữ liệu cảm biến lên server.
     * @param data - Dữ liệu cảm biến.
     */
    sensorData: (data: { gas?: number; temperature?: number; humidity?: number; type?: string }) => void;
    /**
     * Gửi ping tới server.
     */
    ping: () => void;
    /**
     * Bắt đầu gửi dữ liệu thiết bị theo thời gian thực.
     * @param data - Thông tin thiết bị.
     */
    start_real_time_device: (data: { deviceId: string }) => void;
    /**
     * Dừng gửi dữ liệu thiết bị theo thời gian thực.
     * @param data - Thông tin thiết bị.
     */
    stop_real_time_device: (data: { deviceId: string }) => void;
}

/**
 * Các sự kiện giữa các server.
 */
export interface InterServerEvents {
    /**
     * Gửi ping giữa các server.
     */
    ping: () => void;
}

/**
 * Kiểu socket cho thiết bị, định nghĩa các sự kiện và dữ liệu liên quan.
 */
export type DeviceSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    DeviceSocketData
>;