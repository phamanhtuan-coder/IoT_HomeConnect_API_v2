// src/types/socket.ts
import { Socket } from 'socket.io';

export interface DeviceSocketData {
    deviceId: string;
    accountId?: string;
    isIoTDevice: boolean;
}

export interface ServerToClientEvents {
    device_connect: (data: { deviceId: string }) => void;
    device_disconnect: (data: { deviceId: string }) => void;
    device_online: (data: { deviceId: string }) => void;
    sensorData: (data: { deviceId: string; gas?: number; temperature?: number; humidity?: number }) => void;
    command: (data: { action: string; [key: string]: any }) => void;
    realtime_device_value: (data: { serial: string; data: { val: any } }) => void;
}

export interface ClientToServerEvents {
    device_online: () => void;
    sensorData: (data: { gas?: number; temperature?: number; humidity?: number; type?: string }) => void;
    ping: () => void;
    start_real_time_device: (data: { deviceId: string }) => void;
    stop_real_time_device: (data: { deviceId: string }) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export type DeviceSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    DeviceSocketData
>;