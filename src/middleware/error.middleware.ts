import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError, ErrorCodes } from '../utils/errors';
import { ZodError } from 'zod';

/**
 * Middleware xử lý lỗi cho ứng dụng Express.
 *
 * - Ghi log lỗi với thông tin method và path.
 * - Nếu lỗi là AppError, trả về mã lỗi và message tương ứng.
 * - Nếu lỗi là ZodError (lỗi validate), trả về mã lỗi BAD_REQUEST và chi tiết lỗi.
 * - Nếu là lỗi khác, trả về mã lỗi INTERNAL_SERVER_ERROR.
 *
 * @param err Lỗi phát sinh (Error hoặc AppError)
 * @param req Đối tượng Request của Express
 * @param res Đối tượng Response của Express
 * @param next Hàm next của middleware
 */
const errorMiddleware: ErrorRequestHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Chỉ ghi message thay vì toàn bộ stack
    console.error(`[${req.method} ${req.path}] Error: ${err.message}`);

    if (err instanceof AppError) {
        const response = {
            status: 'error',
            code: err.code,
            message: err.message,
        };
        res.status(err.status).json(response);
        console.log(`Response: ${JSON.stringify(response)}`); // Log response
    } else if (err instanceof ZodError) {
        const response = {
            status: 'error',
            code: ErrorCodes.BAD_REQUEST,
            message: 'Validation failed',
            details: err.errors,
        };
        res.status(400).json(response);
        console.log(`Response: ${JSON.stringify(response)}`);
    } else {
        const response = {
            status: 'error',
            code: ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
        };
        res.status(500).json(response);
        console.log(`Response: ${JSON.stringify(response)}`);
    }
};

export default errorMiddleware;