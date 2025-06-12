import { CronJob } from 'cron';
import redisClient from '../utils/redis';

/**
 * Cronjob dọn dẹp Redis blacklist tokens
 * Chạy vào 00:00 hàng ngày
 * Xóa các token đã hết hạn khỏi blacklist
 */
export class RedisCleanupCron {
    public initCronJob() {
        // Chạy vào 00:00 hàng ngày
        const cronJob = new CronJob('0 0 * * *', async () => {
            console.log('Running Redis cleanup cron job...');
            await this.cleanupExpiredTokens();
        });
        cronJob.start();
    }

    private async cleanupExpiredTokens() {
        try {
            // Lấy tất cả các keys trong blacklist
            const pattern = 'blacklist:*';
            const stream = redisClient.scanStream({
                match: pattern,
                count: 100
            });

            let deletedCount = 0;

            for await (const keys of stream) {
                if (!keys.length) continue;

                // Kiểm tra và xóa các token đã hết hạn
                for (const key of keys) {
                    const ttl = await redisClient.ttl(key);
                    if (ttl <= 0) {
                        await redisClient.del(key);
                        deletedCount++;
                    }
                }
            }

            console.log(`Cleaned up ${deletedCount} expired tokens from Redis blacklist`);
        } catch (error) {
            console.error('Error in Redis cleanup cron:', error);
        }
    }
}
