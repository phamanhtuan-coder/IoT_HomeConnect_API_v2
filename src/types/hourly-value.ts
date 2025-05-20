export interface HourlyValue {
    hourly_value_id: number;
    device_serial: string | null;
    space_id: number | null;
    hour_timestamp: Date | null;
    avg_value: Record<string, number | null> | null;
    sample_count: number | null;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean | null;
}