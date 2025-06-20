import { ERROR_CODES, ERROR_MESSAGES } from "../contants/error";

// Enum chứa mã lỗi chi tiết
export enum ErrorCodes {
    // HTTP Errors
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE', // 503
    NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',         // 501
    BAD_REQUEST = 'BAD_REQUEST',               // 400
    UNAUTHORIZED = 'UNAUTHORIZED',             // 401
    FORBIDDEN = 'FORBIDDEN',                   // 403
    NOT_FOUND = 'NOT_FOUND',                   // 404
    CONFLICT = 'CONFLICT',                     // 409
    TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS', // 429

    // Internal Errors
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR', // 500
    DATABASE_ERROR = 'DATABASE_ERROR',         // 500
    CONFIG_ERROR = 'CONFIG_ERROR',             // 500

    // Custom Business Errors
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',       // 401
    DEVICE_ALREADY_LINKED = 'DEVICE_ALREADY_LINKED',   // 409
    INSUFFICIENT_COMPONENTS = 'INSUFFICIENT_COMPONENTS', // 400
    TICKET_NOT_RESOLVABLE = 'TICKET_NOT_RESOLVABLE',   // 400
    TEMPLATE_COMPONENT_NOT_FOUND = 'TEMPLATE_COMPONENT_NOT_FOUND', // 404
    TEMPLATE_COMPONENT_ALREADY_EXISTS = 'TEMPLATE_COMPONENT_ALREADY_EXISTS', // 409
    TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND', // 404
    TEMPLATE_ALREADY_EXISTS = 'TEMPLATE_ALREADY_EXISTS', // 409
    PRODUCTION_NOT_FOUND = 'PRODUCTION_NOT_FOUND', // 404
    COMPONENT_NOT_FOUND = 'COMPONENT_NOT_FOUND',   // 404
    INSUFFICIENT_QUANTITY = 'INSUFFICIENT_QUANTITY', // 400
}

// Interface cho Error Response
export interface ErrorResponse {
    code: string;
    message: string;
    status_code: number;
    data?: any;
}

// Object chứa chi tiết các error response
export const ERROR_RESPONSES: { [key: string]: ErrorResponse } = {
    'BAD_REQUEST': {
        code: ErrorCodes.BAD_REQUEST,
        message: 'Bad request',
        status_code: 400
    },
    'NOT_FOUND': {
        code: ErrorCodes.NOT_FOUND,
        message: 'Resource not found',
        status_code: 404
    },
    'UNAUTHORIZED': {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Unauthorized access',
        status_code: 401
    },
    'FORBIDDEN': {
        code: ErrorCodes.FORBIDDEN,
        message: 'Forbidden access',
        status_code: 403
    },
    'CONFLICT': {
        code: ErrorCodes.CONFLICT,
        message: 'Resource conflict',
        status_code: 409
    },
    'TOO_MANY_REQUESTS': {
        code: ErrorCodes.TOO_MANY_REQUESTS,
        message: 'Too many requests',
        status_code: 429
    },
    'INTERNAL_SERVER_ERROR': {
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        status_code: 500
    },
    'DATABASE_ERROR': {
        code: ErrorCodes.DATABASE_ERROR,
        message: 'Database error',
        status_code: 500
    },
    'INVALID_CREDENTIALS': {
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
        status_code: 401
    },
    'DEVICE_ALREADY_LINKED': {
        code: ErrorCodes.DEVICE_ALREADY_LINKED,
        message: 'Device already linked to another user',
        status_code: 409
    },
    'INSUFFICIENT_COMPONENTS': {
        code: ErrorCodes.INSUFFICIENT_COMPONENTS,
        message: 'Insufficient components for production',
        status_code: 400
    },
    'TEMPLATE_NOT_FOUND': {
        code: ErrorCodes.TEMPLATE_NOT_FOUND,
        message: 'Template not found',
        status_code: 404
    },
    'SERVICE_UNAVAILABLE': {
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        message: 'Service is currently unavailable',
        status_code: 502
    }
};

export function get_error_response(error_code: string | number, status_code?: number, message?: string, data?: any): ErrorResponse {
    const response = ERROR_RESPONSES[error_code] || {
        code: error_code,
        message: message || ERROR_MESSAGES[error_code]  || 'Unknown error',
        status_code: status_code || 500
    };

    if (status_code) {
        response.status_code = status_code;
    }

    if (data) {
        response.data = data;
    }

    return response;
}

// Interface cho AppError
interface ErrorDetails {
    status: number;
    code: ErrorCodes;
    message: string;
    isOperational?: boolean;
}

// Class xử lý lỗi
export class AppError extends Error {
    public status: number;
    public code: ErrorCodes;
    public isOperational: boolean;

    constructor({ status, code, message, isOperational = true }: ErrorDetails) {
        super(message);
        this.status = status;
        this.code = code;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }

    // Factory method tạo lỗi nhanh
    static create(code: ErrorCodes, message?: string): AppError {
        switch (code) {
            // HTTP Errors
            case ErrorCodes.BAD_REQUEST:
                return new AppError({ status: 400, code, message: message || 'Bad request' });
            case ErrorCodes.UNAUTHORIZED:
                return new AppError({ status: 401, code, message: message || 'Unauthorized' });
            case ErrorCodes.FORBIDDEN:
                return new AppError({ status: 403, code, message: message || 'Forbidden' });
            case ErrorCodes.NOT_FOUND:
                return new AppError({ status: 404, code, message: message || 'Not found' });
            case ErrorCodes.CONFLICT:
                return new AppError({ status: 409, code, message: message || 'Conflict' });
            case ErrorCodes.TOO_MANY_REQUESTS:
                return new AppError({ status: 429, code, message: message || 'Too many requests' });
            case ErrorCodes.SERVICE_UNAVAILABLE:
                return new AppError({ status: 502, code, message: message || 'Service unavailable' });

            // Internal Errors
            case ErrorCodes.INTERNAL_SERVER_ERROR:
                return new AppError({ status: 500, code, message: message || 'Internal server error', isOperational: false });
            case ErrorCodes.DATABASE_ERROR:
                return new AppError({ status: 500, code, message: message || 'Database error', isOperational: false });
            case ErrorCodes.CONFIG_ERROR:
                return new AppError({ status: 500, code, message: message || 'Configuration error', isOperational: false });

            // Custom Errors
            case ErrorCodes.INVALID_CREDENTIALS:
                return new AppError({ status: 401, code, message: message || 'Invalid email or password' });
            case ErrorCodes.DEVICE_ALREADY_LINKED:
                return new AppError({ status: 409, code, message: message || 'Device already linked to another user' });

            default:
                return new AppError({ status: 500, code: ErrorCodes.INTERNAL_SERVER_ERROR, message: 'Unknown error' });
        }
    }
}

// Hàm tiện ích throw lỗi
export const throwError = (code: ErrorCodes, message?: string) => {
    throw AppError.create(code, message);
};

