import { PrismaClient } from '@prisma/client';
import { CronJob } from 'cron';
import { UserDeviceService } from '../services/user-device.service';

/**
 * Cronjob tự động logout các thiết bị không hoạt động
 * Chạy vào 00:00 hàng ngày
 * Kiểm tra và logout các thiết bị không hoạt động trong 30 ngày
 */
export class DeviceAutoLogoutCron {
    private prisma: PrismaClient;
    private userDeviceService: UserDeviceService;

    constructor() {
        this.prisma = new PrismaClient();
        this.userDeviceService = new UserDeviceService();
    }

    public initCronJob() {
        // Chạy vào 00:00 hàng ngày
        const cronJob = new CronJob('0 0 * * *', async () => {
            console.log('Running device auto logout cron job...');
            await this.autoLogoutInactiveDevices();
        });
        cronJob.start();
    }

    private async autoLogoutInactiveDevices() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Lấy danh sách thiết bị không hoạt động
            const inactiveDevices = await this.prisma.user_devices.findMany({
                where: {
                    is_deleted: false,
                    last_login: {
                        lt: thirtyDaysAgo
                    }
                }
            });

            // Thực hiện logout từng thiết bị
            for (const device of inactiveDevices) {
                if (device.user_id) {
                    await this.userDeviceService.logoutDevice(
                        device.user_device_id,
                        device.user_id,
                        'Auto logout by system due to inactivity'
                    );
                } else {
                    console.log(`Skipped device ${device.user_device_id} - missing user_id`);
                }
            }

            console.log(`Auto logged out ${inactiveDevices.length} inactive devices`);
        } catch (error) {
            console.error('Error in device auto logout cron:', error);
        }
    }
}

