import { ErrorResponse, ERROR_RESPONSES } from './errors';

export function get_error_response(error_code: string, status_code?: number): ErrorResponse {
    return ERROR_RESPONSES[error_code] || {
        code: error_code,
        message: 'Unknown error',
        status_code: status_code || 500
    };
}
