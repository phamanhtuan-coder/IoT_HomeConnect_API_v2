export interface CameraStreamResponse {
    success: boolean;
    streamUrl: string;
    proxyUrl: string;
    token: string;
    expires: Date;
}

export interface CameraStatusResponse {
    success: boolean;
    status: {
        streamActive: boolean;
        resolution: string;
        quality: number;
        fps: number;
        motionDetection: boolean;
        lastMotion?: Date;
        uptime: number;
        freeHeap: number;
        timestamp: string;
    };
}

export interface CameraConfigResponse {
    success: boolean;
    message: string;
    config: {
        resolution: string;
        quality: number;
        motionDetection: boolean;
        wifi_ssid?: string;
        wifi_password?: string;
    };
}

export interface PhotoCaptureResponse {
    success: boolean;
    filename: string;
    size: number;
    downloadUrl: string;
    timestamp: string;
}

export interface PhotoListResponse {
    success: boolean;
    photos: {
        filename: string;
        size: number;
        timestamp: string;
        thumbnailUrl?: string;
    }[];
    total: number;
}

export interface CameraCommandResponse {
    success: boolean;
    result: any;
    timestamp: string;
}
