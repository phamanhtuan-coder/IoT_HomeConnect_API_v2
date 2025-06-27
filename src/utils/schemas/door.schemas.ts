// src/schemas/door.schemas.ts
import { z } from 'zod';
import { DoorState, DoorAction, DoorPriority } from '../../types/door.types';

/**
 * Door state validation
 */
export const DoorStateSchema = z.nativeEnum(DoorState);

/**
 * Door action validation
 */
export const DoorActionSchema = z.nativeEnum(DoorAction);

/**
 * Door priority validation
 */
export const DoorPrioritySchema = z.nativeEnum(DoorPriority);

/**
 * Door serial number validation
 */
export const DoorSerialSchema = z.object({
    serialNumber: z.string()
        .min(1, 'Serial number is required')
        .regex(/^DOOR_[A-Z0-9]{3,10}$/, 'Invalid door serial format. Expected: DOOR_XXX')
});

/**
 * Door toggle request validation
 */
export const DoorToggleSchema = z.object({
    power_status: z.boolean().optional().default(true),
    force: z.boolean().optional().default(false),
    timeout: z.number().min(1000).max(30000).optional().default(5000) // 1-30 seconds
});

/**
 * Door configuration validation
 */
export const DoorConfigSchema = z.object({
    servo_open_angle: z.number().min(0).max(180).default(90),
    servo_close_angle: z.number().min(0).max(180).default(0),
    movement_duration: z.number().min(500).max(5000).default(1000), // 0.5-5 seconds
    auto_close_delay: z.number().min(0).max(300000).optional(), // Max 5 minutes
    obstacle_detection: z.boolean().default(false),
    manual_override_enabled: z.boolean().default(true),
    emergency_mode: z.boolean().default(false),
    max_retry_attempts: z.number().min(0).max(5).default(3)
});

/**
 * Door configuration update validation
 */
export const DoorConfigUpdateSchema = z.object({
    config: DoorConfigSchema.partial()
});

/**
 * Door command validation
 */
export const DoorCommandSchema = z.object({
    action: DoorActionSchema,
    state: z.object({
        power_status: z.boolean().optional(),
        target_angle: z.number().min(0).max(180).optional(),
        speed: z.number().min(1).max(10).optional().default(5)
    }).optional(),
    priority: DoorPrioritySchema.optional().default(DoorPriority.NORMAL),
    timeout: z.number().min(1000).max(30000).optional().default(5000),
    force: z.boolean().optional().default(false)
});

/**
 * Door emergency operation validation
 */
export const DoorEmergencySchema = z.object({
    door_serial_numbers: z.array(
        z.string().regex(/^DOOR_[A-Z0-9]{3,10}$/)
    ).min(1, 'At least one door serial number required'),
    action: z.enum(['open', 'close']),
    override_manual: z.boolean().optional().default(true)
});

/**
 * Door bulk operation validation
 */
export const DoorBulkOperationSchema = z.object({
    door_serial_numbers: z.array(
        z.string().regex(/^DOOR_[A-Z0-9]{3,10}$/)
    ).min(1).max(50, 'Maximum 50 doors per bulk operation'),
    action: DoorActionSchema,
    state: z.object({
        power_status: z.boolean().optional(),
        target_angle: z.number().min(0).max(180).optional()
    }).optional(),
    priority: DoorPrioritySchema.optional().default(DoorPriority.NORMAL)
});

/**
 * Door sensor data validation
 */
export const DoorSensorDataSchema = z.object({
    serialNumber: z.string(),
    door_state: DoorStateSchema,
    servo_angle: z.number().min(0).max(180),
    is_moving: z.boolean(),
    last_action: z.string(),
    movement_duration: z.number().optional(),
    obstacle_detected: z.boolean().optional(),
    manual_override: z.boolean().optional(),
    battery_level: z.number().min(0).max(100).optional(),
    signal_strength: z.number().min(-100).max(0).optional(),
    timestamp: z.string()
});

/**
 * Door status response validation
 */
export const DoorStatusResponseSchema = z.object({
    serialNumber: z.string(),
    current_state: DoorStateSchema,
    target_state: DoorStateSchema.optional(),
    servo_angle: z.number().min(0).max(180),
    is_moving: z.boolean(),
    last_command: z.string(),
    uptime: z.number().min(0),
    free_memory: z.number().min(0),
    error_count: z.number().min(0),
    timestamp: z.string()
});

/**
 * Door calibration validation
 */
export const DoorCalibrateSchema = z.object({
    angles: z.object({
        open: z.number().min(0).max(180).optional(),
        close: z.number().min(0).max(180).optional()
    }).optional(),
    save_to_eeprom: z.boolean().optional().default(true)
});

/**
 * Door test validation
 */
export const DoorTestSchema = z.object({
    test_type: z.enum(['movement', 'obstacle', 'full']).default('movement'),
    repeat_count: z.number().min(1).max(10).optional().default(1)
});

/**
 * Door maintenance request validation
 */
export const DoorMaintenanceSchema = z.object({
    maintenance_type: z.enum(['reset_counters', 'calibrate', 'factory_reset', 'update_firmware']),
    backup_config: z.boolean().optional().default(true)
});

/**
 * Composite validation for door device registration
 */
export const DoorDeviceRegistrationSchema = z.object({
    serialNumber: z.string().regex(/^DOOR_[A-Z0-9]{3,10}$/),
    device_name: z.string().min(1).max(50),
    location: z.string().min(1).max(100),
    config: DoorConfigSchema.optional(),
    capabilities: z.object({
        servo_range: z.object({
            min: z.number().min(0).max(180).default(0),
            max: z.number().min(0).max(180).default(180)
        }),
        supports_obstacle_detection: z.boolean().default(false),
        supports_manual_override: z.boolean().default(true),
        supports_emergency_mode: z.boolean().default(true)
    }).optional()
});

/**
 * Door query filters validation
 */
export const DoorQueryFiltersSchema = z.object({
    state: DoorStateSchema.optional(),
    location: z.string().optional(),
    is_moving: z.boolean().optional(),
    has_errors: z.boolean().optional(),
    last_seen_after: z.string().datetime().optional(),
    last_seen_before: z.string().datetime().optional()
});