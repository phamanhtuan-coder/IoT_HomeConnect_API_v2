export type EmergencyType = 'fire' | 'obstruction' | 'motor_failure' | 'sensor_failure';

export interface EmergencyHandlerData {
    serialNumber: string;
    type: EmergencyType;
    message: string;
}
