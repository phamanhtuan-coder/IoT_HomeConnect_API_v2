import { DeviceAutoLogoutCron } from './device-auto-logout.cron';
import { RedisCleanupCron } from './redis-cleanup.cron';
import { SyncTrackingCleanupCron } from './sync-tracking-cleanup.cron';

/**
 * Khởi tạo tất cả các cronjob của hệ thống
 */
export function initCronJobs() {
    // Cronjob tự động logout thiết bị không hoạt động sau 30 ngày
    const deviceAutoLogout = new DeviceAutoLogoutCron();
    deviceAutoLogout.initCronJob();

    // Cronjob dọn dẹp Redis blacklist tokens hết hạn
    const redisCleanup = new RedisCleanupCron();
    redisCleanup.initCronJob();

    // Cronjob xóa/archive các sync tracking record cũ hơn 90 ngày
    const syncTrackingCleanup = new SyncTrackingCleanupCron();
    syncTrackingCleanup.initCronJob();

    console.log('Initialized all maintenance cron jobs');
}
