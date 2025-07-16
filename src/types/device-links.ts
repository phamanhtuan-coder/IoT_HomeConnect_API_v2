export interface DeviceLink {
    id: number;
    input_device_id: string;
    output_device_id: string;
    component_id: string;
    value_active: string;
    logic_operator: 'AND' | 'OR';
    output_action: 'turn_on' | 'turn_off';
    output_value?: string; // Thêm field để set giá trị cho output
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
    component?: {
        component_id: string;
        name: string;
        name_display: string;
        datatype: string;
        unit: string;
        flow_type: string;
    };
}

export interface DeviceLinkInput {
    input_device_id: string;
    output_device_id: string;
    component_id?: string;
    value_active: string;
    logic_operator?: 'AND' | 'OR';
    output_action?: 'turn_on' | 'turn_off';
    output_value?: string; // Thêm field để set giá trị cho output
}

export interface DeviceLinkUpdate {
    value_active?: string;
    logic_operator?: 'AND' | 'OR';
    component_id?: string;
    output_action?: 'turn_on' | 'turn_off';
    output_value?: string; // Thêm field để set giá trị cho output
}

export interface DeviceLinkCreateRequest {
    input_device_id: string;
    output_device_id: string;
    component_id?: string;
    value_active: string;
    logic_operator?: 'AND' | 'OR';
    output_action?: 'turn_on' | 'turn_off';
    output_value?: string; // Thêm field để set giá trị cho output
}

export interface DeviceLinkUpdateRequest {
    value_active?: string;
    logic_operator?: 'AND' | 'OR';
    component_id?: string;
    output_action?: 'turn_on' | 'turn_off';
    output_value?: string; // Thêm field để set giá trị cho output
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