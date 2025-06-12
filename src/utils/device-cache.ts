import redisClient from './redis';

export class DeviceCache {
    private static DEVICE_KEY_PREFIX = 'device:';
    private static CACHE_TTL = 3600; // 1 giờ

    /**
     * Cache thông tin thiết bị
     */
    static async setDeviceInfo(deviceId: string, deviceInfo: any) {
        const key = this.DEVICE_KEY_PREFIX + deviceId;
        await redisClient.setex(key, this.CACHE_TTL, JSON.stringify(deviceInfo));
    }

    /**
     * Lấy thông tin thiết bị từ cache
     */
    static async getDeviceInfo(deviceId: string) {
        const key = this.DEVICE_KEY_PREFIX + deviceId;
        const cachedData = await redisClient.get(key);
        return cachedData ? JSON.parse(cachedData) : null;
    }

    /**
     * Xóa thông tin thiết bị khỏi cache
     */
    static async invalidateDeviceCache(deviceId: string) {
        const key = this.DEVICE_KEY_PREFIX + deviceId;
        await redisClient.del(key);
    }

    /**
     * Cache nhiều thiết bị
     */
    static async setMultipleDevices(devices: { id: string, data: any }[]) {
        const pipeline = redisClient.pipeline();
        devices.forEach(device => {
            const key = this.DEVICE_KEY_PREFIX + device.id;
            pipeline.setex(key, this.CACHE_TTL, JSON.stringify(device.data));
        });
        await pipeline.exec();
    }

    /**
     * Lấy thông tin nhiều thiết bị từ cache
     */
    static async getMultipleDevices(deviceIds: string[]) {
        const pipeline = redisClient.pipeline();
        deviceIds.forEach(id => {
            const key = this.DEVICE_KEY_PREFIX + id;
            pipeline.get(key);
        });
        const results = await pipeline.exec();
        return results
            ?.map(([error, value], index) => {
                if (error) return null;
                return {
                    id: deviceIds[index],
                    data: value ? JSON.parse(value as string) : null
                };
            })
            .filter(item => item && item.data);
    }
}
