// Enum chứa mã lỗi chi tiết
export enum ErrorCodes {
    // HTTP Errors
    NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',         // 501
    BAD_REQUEST = 'BAD_REQUEST',               // 400
    UNAUTHORIZED = 'UNAUTHORIZED',             // 401
    FORBIDDEN = 'FORBIDDEN',                   // 403
    NOT_FOUND = 'NOT_FOUND',                   // 404
    CONFLICT = 'CONFLICT',                     // 409

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
            case ErrorCodes.INSUFFICIENT_COMPONENTS:
                return new AppError({ status: 400, code, message: message || 'Insufficient components for production' });
            case ErrorCodes.TICKET_NOT_RESOLVABLE:
                return new AppError({ status: 400, code, message: message || 'Ticket cannot be resolved yet' });
            case ErrorCodes.TEMPLATE_COMPONENT_NOT_FOUND:
                return new AppError({status: 404, code, message: message || 'Template component not found'});
            case ErrorCodes.TEMPLATE_COMPONENT_ALREADY_EXISTS:
                return new AppError({status: 409, code, message: message || 'Template component already exists'});

            default:
                return new AppError({ status: 500, code: ErrorCodes.INTERNAL_SERVER_ERROR, message: 'Unknown error' });
        }
    }
}

// Hàm tiện ích throw lỗi
export const throwError = (code: ErrorCodes, message?: string) => {
    throw AppError.create(code, message);
};