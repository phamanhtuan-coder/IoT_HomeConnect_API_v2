
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


export interface LEDEffectState {
    effect: 'solid' | 'blink' | 'breathe' | 'rainbow' | 'chase' | 'fade' | 'strobe' | 'colorWave';
    effect_active: boolean;
    effect_speed: number;     // milliseconds
    effect_count: number;     // for blink/strobe count (0 = infinite)
    effect_duration: number;  // total duration in milliseconds (0 = infinite)
    effect_color1: string;    // primary color (#RRGGBB)
    effect_color2: string;    // secondary color for transitions (#RRGGBB)
}

// Enhanced DeviceState interface (ADD these properties)
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

    // NEW: LED Effects properties
    effect?: 'solid' | 'blink' | 'breathe' | 'rainbow' | 'chase' | 'fade' | 'strobe' | 'colorWave';
    effect_active?: boolean;
    effect_speed?: number;
    effect_count?: number;
    effect_duration?: number;
    effect_color1?: string;
    effect_color2?: string;

    [key: string]: any;     // extensible for future devices
}

export interface LEDEffectInput {
    effect: 'solid' | 'blink' | 'breathe' | 'rainbow' | 'chase' | 'fade' | 'strobe' | 'colorWave';
    speed?: number;         // 100-2000ms, default 500
    count?: number;         // 1-50 for blink/strobe, 0 = infinite
    duration?: number;      // 1000-60000ms, 0 = infinite
    color1?: string;        // primary color, default current color
    color2?: string;        // secondary color, default complementary
}