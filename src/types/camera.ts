interface CameraInfo {
    serialNumber: string;
    ip_address: string;
    status: string;
    account_id: string;
    attribute?: any; // Adding attribute field to match usage in service
}

interface PhotoMetadata {
    serialNumber: string;
    filename: string;
    size: number;
    capturedAt: Date;
    savedToSD: boolean;
}

interface MotionAlertData {
    intensity: number;
    region: string;
}

interface CameraStatus {
    status: string;
    streamActive: boolean;
    resolution: number | string;
    fps: number;
    clients: number;
    uptime: number;
    freeHeap: number;
    timestamp: string;
    quality?: number; // Added missing properties used in the service
    motionDetection?: boolean;
}

interface CameraCommand {
    action: string;
    params?: any;
}

interface CameraConfig {
    resolution?: string | number; // Allowing string or number to be compatible with both usages
    quality?: number;
    motionDetection?: boolean;
    wifi_ssid?: string;
    wifi_password?: string;
    [key: string]: any;
}

interface CameraCapabilities {
    base: {
        capabilities?: string[];
        deviceType?: string;
        category?: string;
        controls?: { [key: string]: string };
        [key: string]: any;
    };
    runtime: {
        capabilities?: string[];
        deviceType?: string;
        category?: string;
        hardware_version?: string;
        controls?: { [key: string]: string };
        [key: string]: any;
    };
    firmware_version: string | null;
    firmware_id: string | null;
    merged_capabilities: {
        capabilities: string[];
        deviceType?: string;
        category?: string;
        hardware_version?: string;
        isInput?: boolean;
        isOutput?: boolean;
        isSensor?: boolean;
        isActuator?: boolean;
        controls: { [key: string]: string };
    };
}

export {
    CameraInfo,
    PhotoMetadata,
    MotionAlertData,
    CameraStatus,
    CameraCommand,
    CameraConfig,
    CameraCapabilities
};
