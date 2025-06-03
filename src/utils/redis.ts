// src/utils/redis.ts
import Redis from 'ioredis';

const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD, // 🚨 Thêm dòng này
    retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
    },
    maxRetriesPerRequest: null, // Disable max retries per request
    enableReadyCheck: true,
    reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
            // Only reconnect when the error contains "READONLY"
            return true;
        }
        return false;
    }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));
redisClient.on('ready', () => console.log('Redis Client Ready'));
redisClient.on('reconnecting', () => console.log('Redis Client Reconnecting'));

export async function blacklistToken(token: string, expiresIn: number) {
    await redisClient.setex(`blacklist:${token}`, expiresIn, '1');
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await redisClient.get(`blacklist:${token}`);
    return result === '1';
}

export async function setDeviceAccountMapping(deviceId: string, accountId: string, ttl: number = 3600) {
    await redisClient.setex(`device:${deviceId}:account`, ttl, accountId);
}

export async function getDeviceAccountMapping(deviceId: string): Promise<string | null> {
    return await redisClient.get(`device:${deviceId}:account`);
}

export async function removeDeviceAccountMapping(deviceId: string) {
    await redisClient.del(`device:${deviceId}:account`);
}

export default redisClient;

