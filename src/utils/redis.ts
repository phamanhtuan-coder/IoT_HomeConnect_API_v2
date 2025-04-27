// src/utils/redis.ts
import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
    await redisClient.connect();
})();

export async function blacklistToken(token: string, expiresIn: number) {
    await redisClient.setEx(`blacklist:${token}`, expiresIn, '1');
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await redisClient.get(`blacklist:${token}`);
    return result === '1';
}

export async function setDeviceAccountMapping(deviceId: string, accountId: string, ttl: number = 3600) {
    await redisClient.setEx(`device:${deviceId}:account`, ttl, accountId);
}

export async function getDeviceAccountMapping(deviceId: string): Promise<string | null> {
    return await redisClient.get(`device:${deviceId}:account`);
}

export async function removeDeviceAccountMapping(deviceId: string) {
    await redisClient.del(`device:${deviceId}:account`);
}

export default redisClient;