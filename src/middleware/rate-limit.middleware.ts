import {Request, Response, NextFunction} from 'express';
import {ErrorCodes, throwError} from '../utils/errors';
import redisClient from '../utils/redis';

/**
 * Middleware giới hạn số lần request trong một khoảng thời gian
 * @param prefix Tiền tố cho key Redis
 * @param maxAttempts Số lần request tối đa
 * @param window Thời gian giới hạn (giây)
 */
export const rateLimiter = (prefix: string, maxAttempts: number, window: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ip = req.ip;
            const key = `${prefix}:${ip}`;

            const currentAttempts = await redisClient.incr(key);

            // Nếu là lần đầu tiên, set thời gian tồn tại cho key
            if (currentAttempts === 1) {
                await redisClient.expire(key, window);
            }

            // Kiểm tra số lần request
            if (currentAttempts > maxAttempts) {
                throwError(
                    ErrorCodes.TOO_MANY_REQUESTS,
                    `Too many requests. Please try again after ${window} seconds`
                );
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware xử lý giới hạn đăng nhập và block IP
 */
export const loginRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ip = req.ip;
        const username = req.body.username;

        if (!username) {
            throwError(ErrorCodes.BAD_REQUEST, 'Username is required');
        }

        const ipKey = `login:ip:${ip}`;
        const usernameKey = `login:user:${username}`;
        const blockIpKey = `block:ip:${ip}`;
        const blockUserKey = `block:user:${username}`;

        // Kiểm tra IP có bị block
        const isIpBlocked = await redisClient.get(blockIpKey);
        if (isIpBlocked) {
            const ttl = await redisClient.ttl(blockIpKey);
            throwError(
                ErrorCodes.TOO_MANY_REQUESTS,
                `IP is blocked. Please try again after ${Math.ceil(ttl / 60)} minutes`
            );
        }

        // Kiểm tra tài khoản có bị block
        const isUserBlocked = await redisClient.get(blockUserKey);
        if (isUserBlocked) {
            const ttl = await redisClient.ttl(blockUserKey);
            throwError(
                ErrorCodes.TOO_MANY_REQUESTS,
                `Account is locked. Please try again after ${Math.ceil(ttl / 60)} minutes`
            );
        }

        // Tăng số lần thử đăng nhập
        const ipAttempts = await redisClient.incr(ipKey);
        const userAttempts = await redisClient.incr(usernameKey);

        // Lần đầu tiên, set thời gian tồn tại
        if (ipAttempts === 1) {
            await redisClient.expire(ipKey, 3600); // 1 giờ
        }
        if (userAttempts === 1) {
            await redisClient.expire(usernameKey, 3600); // 1 giờ
        }

        // Block IP nếu vượt quá 10 lần thất bại
        if (ipAttempts > 10) {
            let blockTime = 60;
            await redisClient.setex(blockIpKey, blockTime, '1'); // Block 2 giờ
            throwError(
                ErrorCodes.TOO_MANY_REQUESTS,
                // 'IP của bạn đã bị khóa do quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 2 giờ.'
                `IP của bạn đã bị khóa do quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau ${blockTime / 60} phút`
            );
        }

        // Block tài khoản nếu vượt quá 5 lần thất bại
        if (userAttempts > 5) {
            await redisClient.setex(blockUserKey, 3600, '1'); // Block 1 giờ
            throwError(
                ErrorCodes.TOO_MANY_REQUESTS,
                'Tài khoản của bạn đã bị khóa do quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 1 giờ.'

            );
        }

        // Lưu request để xử lý sau khi login thành công/thất bại
        res.locals.loginAttempt = {
            ip,
            username,
            ipKey,
            usernameKey,
            blockIpKey,
            blockUserKey
        };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware xử lý sau khi login thành công
 */
export const afterSuccessfulLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {ip, username, ipKey, usernameKey, blockIpKey, blockUserKey} = res.locals.loginAttempt;

        // Xóa các key rate limit và block
        await Promise.all([
            redisClient.del(ipKey),
            redisClient.del(usernameKey),
            redisClient.del(blockIpKey),
            redisClient.del(blockUserKey)
        ]);

        next();
    } catch (error) {
        next(error);
    }
};
