export interface DeviceLink {
    id: number;
    input_device_id: string;
    output_device_id: string;
    value_active: string;
    logic_operator: 'AND' | 'OR';
    created_at: Date | null;
    updated_at: Date | null;
    deleted_at: Date | null;
    input_device?: {
        device_id: string;
        serial_number: string;
        name: string;
        current_value: any;
    };
    output_device?: {
        device_id: string;
        serial_number: string;
        name: string;
        power_status: boolean;
        attribute: any;
    };
}

export interface DeviceLinkInput {
    input_device_id: string;
    output_device_id: string;
    value_active: string;
    logic_operator?: 'AND' | 'OR';
}

export interface DeviceLinkUpdate {
    value_active?: string;
    logic_operator?: 'AND' | 'OR';
}

export interface DeviceLinkCreateRequest {
    input_device_id: string;
    output_device_id: string;
    value_active: string;
    logic_operator?: 'AND' | 'OR';
}

export interface DeviceLinkUpdateRequest {
    value_active?: string;
    logic_operator?: 'AND' | 'OR';
}

export interface DeviceLinkResponse {
    success: boolean;
    message: string;
    data?: DeviceLink;
}

export interface DeviceLinksListResponse {
    success: boolean;
    message: string;
    data: DeviceLink[];
} 