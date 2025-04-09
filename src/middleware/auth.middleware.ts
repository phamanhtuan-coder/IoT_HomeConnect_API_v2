import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { throwError, ErrorCodes } from '../utils/errors';
import { AuthJwtPayload } from '../types/auth';

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