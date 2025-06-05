// src/utils/redis.ts
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL || '');


redisClient.on('ready', () => {
    console.log('✅ Redis Client is READY');
});

redisClient.on('error', (err) => {
    console.error('❌ Redis Error:', err);
});
redisClient.on('connect', () => console.log('Redis Client Connected'));
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
    return redisClient.get(`device:${deviceId}:account`);
}

export async function removeDeviceAccountMapping(deviceId: string) {
    await redisClient.del(`device:${deviceId}:account`);
}

export default redisClient;

