
export interface DeviceState {
    power_status: boolean;
    brightness?: number;      // 0-100
    color?: string;          // hex format (#RRGGBB)
    temperature?: number;     // sensor data (read-only)
    humidity?: number;       // sensor data (read-only)
    gas?: number;           // sensor data (read-only)
    alarmActive?: boolean;   // alarm devices
    buzzerOverride?: boolean; // alarm buzzer control
    wifi_ssid?: string;     // wifi configuration
    wifi_password?: string; // wifi configuration
    [key: string]: any;     // extensible for future devices
}

export interface StateUpdateInput extends Partial<DeviceState> {
    // Only allow updates to controllable properties
    power_status?: boolean;
    brightness?: number;
    color?: string;
    alarmActive?: boolean;
    buzzerOverride?: boolean;
    wifi_ssid?: string;
    wifi_password?: string;
}

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