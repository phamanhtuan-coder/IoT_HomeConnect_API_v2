import { PrismaClient } from '@prisma/client';
import { CronJob } from 'cron';

/**
 * Cronjob xóa/archive các sync tracking record cũ
 * Chạy vào 00:00 hàng ngày
 * Xóa các record cũ hơn 90 ngày
 */
export class SyncTrackingCleanupCron {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    public initCronJob() {
        // Chạy vào 00:00 hàng ngày
        const cronJob = new CronJob('0 0 * * *', async () => {
            console.log('Running sync tracking cleanup cron job...');
            await this.cleanupOldRecords();
        });
        cronJob.start();
    }

    private async cleanupOldRecords() {
        try {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            // Soft delete các record cũ
            const result = await this.prisma.sync_tracking.updateMany({
                where: {
                    last_synced_at: {
                        lt: ninetyDaysAgo
                    },
                    is_deleted: false
                },
                data: {
                    is_deleted: true,
                    updated_at: new Date()
                }
            });

            console.log(`Archived ${result.count} old sync tracking records`);
        } catch (error) {
            console.error('Error in sync tracking cleanup cron:', error);
        }
    }
}
