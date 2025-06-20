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
        [key: string]: string;
    };
}

export interface PresetInput {
    presetId: string;
    duration?: number;
    params?: Record<string, any>;
}

export const AVAILABLE_LED_EFFECTS = [
    'solid', 'blink', 'breathe', 'rainbow', 'chase', 'fade',
    'strobe', 'colorWave', 'sparkle', 'rainbowMove', 'disco',
    'meteor', 'pulse', 'twinkle', 'fireworks'
];

export type LEDEffect = typeof AVAILABLE_LED_EFFECTS[number];

export interface DeviceState {
    power_status: boolean;
    brightness?: number;
    color?: string;
    temperature?: number;
    humidity?: number;
    gas?: number;
    alarmActive?: boolean;
    buzzerOverride?: boolean;
    wifi_ssid?: string;
    wifi_password?: string;

    // LED Effects properties
    effect?: string;
    effect_active?: boolean;
    effect_preset?: string | ""; // Changed to allow empty string instead of null
    effect_params?: LEDEffectParams | Record<string, any> | undefined; // Updated to proper type
    effect_speed?: number;
    effect_count?: number;
    effect_duration?: number;
    effect_color1?: string;
    effect_color2?: string;

    [key: string]: any;
}

export interface LEDEffectParams {
    effect: string;
    speed?: number;
    count?: number;
    duration?: number;
    color1?: string;
    color2?: string;
}

export interface LEDEffectInput {
    effect: string;
    speed?: number;
    count?: number;
    duration?: number;
    color1?: string;
    color2?: string;
}

// Helper type for LED preset management
export interface LEDPresetDefinition {
    effect: string;
    speed: number;
    count: number;
    duration: number;
    color1?: string;
    color2?: string;
    description?: string;
}

export type LEDPresetMap = {
    [key: string]: LEDEffectInput;
};
