import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { throwError, ErrorCodes } from '../utils/errors';
import { AuthJwtPayload } from '../types/auth';

/**
 * Middleware xác thực JWT cho các route yêu cầu đăng nhập.
 *
 * - Kiểm tra header Authorization có định dạng 'Bearer \<token\>'.
 * - Giải mã và xác thực token bằng secret key từ biến môi trường JWT_SECRET.
 * - Nếu token hợp lệ, gán payload vào req.user và gọi next().
 * - Nếu token không hợp lệ hoặc hết hạn, trả về lỗi UNAUTHORIZED với thông báo phù hợp.
 *
 * @param req Request từ Express
 * @param res Response từ Express
 * @param next Hàm next để chuyển sang middleware tiếp theo
 */
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throwError(ErrorCodes.UNAUTHORIZED, 'Invalid authorization format');
        return;
    }
    const token = authHeader.split(' ')[1];

    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }

    try {
        const decoded = jwt.verify(token, secretKey) as AuthJwtPayload;
        req.user = decoded;
        next();
    } catch (error: unknown) {
        console.log('error', error)
        if (error instanceof Error) {
            if (error.name === 'TokenExpiredError') {
                throwError(ErrorCodes.UNAUTHORIZED, 'Token has expired');
            } else if (error.name === 'JsonWebTokenError') {
                throwError(ErrorCodes.UNAUTHORIZED, 'Invalid token');
            } else {
                throwError(ErrorCodes.UNAUTHORIZED, 'Authentication failed');
            }
        } else {
            throwError(ErrorCodes.UNAUTHORIZED, 'Authentication failed');
        }
    }
};
export default authMiddleware;