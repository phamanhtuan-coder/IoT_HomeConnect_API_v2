export interface CameraInfo {
    serialNumber: string;
    ip_address: string;
    public_url: string | null;
    status: string;
    account_id: string;
    attribute: any;
}

export interface CameraStreamResponse {
    success: boolean;
    streamUrl: string;
    proxyUrl: string;
    token: string;
    expires: Date;
}

export interface CameraCapabilities {
    base: any;
    runtime: any;
    firmware_version: string | null;
    firmware_id: string | null;
    merged_capabilities: string[];
}

export interface CameraControlInput {
    action: string;
    params: any;
}

export interface CameraCommandResponse {
    success: boolean;
    result: any;
    timestamp: string;
}