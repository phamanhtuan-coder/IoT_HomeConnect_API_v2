import { createClient } from 'redis';

const redisClient = createClient({
    url: 'redis://localhost:6379', // Adjust if using a different host/port
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

export default redisClient;