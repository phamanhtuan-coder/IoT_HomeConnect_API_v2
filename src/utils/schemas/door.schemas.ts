import { z } from 'zod';

// ✅ VALIDATION SCHEMAS

const DoorSerialSchema = z.object({
    params: z.object({
        serialNumber: z.string().min(1, 'Serial number is required')
    })
});

const DoorToggleSchema = z.object({
    power_status: z.boolean().optional().default(true),
    force: z.boolean().optional().default(false),
    timeout: z.number().min(1000).max(30000).optional().default(5000)
});

// ✅ ENHANCED CONFIG SCHEMAS FOR ALL DOOR TYPES
const ServoConfigSchema = z.object({
    door_type: z.literal('SERVO').optional(),
    open_angle: z.number().min(0).max(180).optional(),
    close_angle: z.number().min(0).max(180).optional(),
    movement_speed: z.number().min(1).max(10).optional()
});

const RollingConfigSchema = z.object({
    door_type: z.literal('ROLLING').optional(),
    open_rounds: z.number().min(1).max(10).optional(),
    closed_rounds: z.number().min(0).max(10).optional(),
    motor_speed: z.number().min(5).max(50).optional()
});

const SlidingConfigSchema = z.object({
    door_type: z.literal('SLIDING').optional(),
    motor_speed: z.number().min(50).max(255).optional(),
    open_duration: z.number().min(500).max(10000).optional(),
    close_duration: z.number().min(500).max(10000).optional(),
    wait_before_close: z.number().min(1000).max(30000).optional(),
    auto_mode: z.boolean().optional(),
    pir1_enabled: z.boolean().optional(),
    pir2_enabled: z.boolean().optional()
});

const UniversalConfigSchema = z.union([
    ServoConfigSchema,
    RollingConfigSchema,
    SlidingConfigSchema
]);

// ✅ CALIBRATION SCHEMAS
const ServoCalibrationSchema = z.object({
    door_type: z.literal('SERVO').optional(),
    openAngle: z.number().min(0).max(180).optional(),
    closeAngle: z.number().min(0).max(180).optional(),
    save_to_eeprom: z.boolean().optional().default(true)
});

const RollingCalibrationSchema = z.object({
    door_type: z.literal('ROLLING').optional(),
    openRounds: z.number().min(1).max(10).optional(),
    save_to_eeprom: z.boolean().optional().default(true)
});

const SlidingCalibrationSchema = z.object({
    door_type: z.literal('SLIDING').optional(),
    openDuration: z.number().min(500).max(10000).optional(),
    save_to_eeprom: z.boolean().optional().default(true)
});

const UniversalCalibrationSchema = z.union([
    ServoCalibrationSchema,
    RollingCalibrationSchema,
    SlidingCalibrationSchema
]);

const DoorEmergencySchema = z.object({
    door_serial_numbers: z.array(z.string()).min(1, 'At least one door serial number required'),
    action: z.enum(['open', 'close']),
    override_manual: z.boolean().optional().default(true)
});

const DoorBulkOperationSchema = z.object({
    door_serial_numbers: z.array(z.string()).min(1).max(50, 'Maximum 50 doors per bulk operation'),
    action: z.enum(['toggle_door', 'open_door', 'close_door']),
    state: z.object({
        power_status: z.boolean().optional()
    }).optional(),
    priority: z.enum(['normal', 'high', 'emergency']).optional().default('normal')
});

const DoorTestSchema = z.object({
    test_type: z.enum(['movement', 'sensor', 'full', 'calibration']).default('movement'),
    repeat_count: z.number().min(1).max(10).optional().default(1)
});

const DoorMaintenanceSchema = z.object({
    maintenance_type: z.enum(['reset_counters', 'calibrate', 'factory_reset', 'restart', 'clear_errors']),
    backup_config: z.boolean().optional().default(true),
    notify_completion: z.boolean().optional().default(true)
});

const DoorQueryFiltersSchema = z.object({
    query: z.object({
        state: z.enum(['closed', 'opening', 'open', 'closing', 'error']).optional(),
        door_type: z.enum(['SERVO', 'ROLLING', 'SLIDING']).optional(),
        connection_type: z.enum(['hub_managed', 'direct']).optional(),
        is_moving: z.enum(['true', 'false']).optional(),
        has_errors: z.enum(['true', 'false']).optional(),
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional()
    })
});

// ✅ EXPORT ALL SCHEMAS
export {
    DoorSerialSchema,
    DoorToggleSchema,
    ServoConfigSchema,
    RollingConfigSchema,
    SlidingConfigSchema,
    UniversalConfigSchema,
    ServoCalibrationSchema,
    RollingCalibrationSchema,
    SlidingCalibrationSchema,
    UniversalCalibrationSchema,
    DoorEmergencySchema,
    DoorBulkOperationSchema,
    DoorTestSchema,
    DoorMaintenanceSchema,
    DoorQueryFiltersSchema
};
