import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import redisClient from '../utils/redis';
import { Server } from 'socket.io';
import { HourlyValue } from "../types/hourly-value";
import prisma from "../config/database";

const MINUTE_INTERVAL = 10; // 10 seconds per sample
const SAMPLES_PER_MINUTE = 3; // Giảm xuống để test nhanh hơn
const MINUTES_PER_HOUR = 5; // Giảm xuống để test nhanh hơn

interface SensorData {
    [key: string]: number | null;
}

interface MinuteData {
    count: number;
    values: SensorData;
    timestamp: number;
}

interface HourData {
    count: number;
    values: SensorData;
    timestamp: number;
    total_samples?: number;
}

export function setSocketInstance(socket: Server) {
    io = socket;
}

let io: Server | null = null;

class HourlyValueService {
    private prisma: PrismaClient;
    private readonly BATCH_SIZE = 50;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 1000; // 1 second

    constructor() {
        this.prisma = prisma;
    }

    /**
     * Xử lý dữ liệu cảm biến với tối ưu hóa toàn diện
     * Sử dụng Redis pipeline, Lua scripts và batch processing
     */
    async processSensorData(serialNumber: string, data: {
        gas?: number | undefined;
        temperature?: number | undefined;
        humidity?: number | undefined
    }) {
        const startTime = Date.now();
        
        try {
            // Validate input data
            if (!serialNumber || !data) {
                console.warn(`Invalid input data for device ${serialNumber}`);
                return;
            }

            // Filter valid numeric values and convert undefined to null
            const validData: SensorData = {};
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
                    validData[key] = value;
                } else if (value === undefined) {
                    validData[key] = null;
                }
            }

            if (Object.keys(validData).length === 0) {
                console.warn(`No valid sensor data for device ${serialNumber}`);
                return;
            }

            // Process with optimized Redis operations
            await this.processWithRedisPipeline(serialNumber, validData);

            const processingTime = Date.now() - startTime;
            if (processingTime > 100) {
                console.warn(`Slow processing for device ${serialNumber}: ${processingTime}ms`);
            }

        } catch (error) {
            console.error(`Error processing sensor data for ${serialNumber}:`, error);
            
            // Retry with exponential backoff
            await this.retryWithBackoff(() =>
                this.processWithRedisPipeline(serialNumber, this.convertToSensorData(data)), 
                this.MAX_RETRIES
            );
        }
    }

    /**
     * Chuyển đổi dữ liệu đầu vào thành SensorData
     */
    private convertToSensorData(data: {
        gas?: number | undefined;
        temperature?: number | undefined;
        humidity?: number | undefined
    }): SensorData {
        const sensorData: SensorData = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
                sensorData[key] = value;
            } else {
                sensorData[key] = null;
            }
        }
        
        return sensorData;
    }

    /**
     * Xử lý với Redis Pipeline để tối ưu hiệu suất
     */
    private async processWithRedisPipeline(serialNumber: string, data: SensorData) {
        const minuteKey = `device:${serialNumber}:minute`;
        const hourKey = `device:${serialNumber}:hour`;
        const currentTimestamp = Date.now();

        // Lua script để xử lý atomic operations
        const luaScript = `
            local minuteKey = KEYS[1]
            local hourKey = KEYS[2]
            local data = cjson.decode(ARGV[1])
            local currentTimestamp = tonumber(ARGV[2])
            local samplesPerMinute = tonumber(ARGV[3])
            local minutesPerHour = tonumber(ARGV[4])
            
            -- Debug: print input data
            redis.log(redis.LOG_WARNING, "Input data: " .. cjson.encode(data))
            redis.log(redis.LOG_WARNING, "Samples per minute: " .. samplesPerMinute)
            
            -- Get current minute data
            local minuteDataStr = redis.call('GET', minuteKey)
            local minuteData
            if minuteDataStr then
                minuteData = cjson.decode(minuteDataStr)
                redis.log(redis.LOG_WARNING, "Existing minute data: " .. minuteDataStr)
            else
                minuteData = {count = 0, values = {}, timestamp = currentTimestamp}
                redis.log(redis.LOG_WARNING, "New minute data created")
            end
            
            -- Accumulate values (only for non-null values)
            for key, value in pairs(data) do
                if type(value) == 'number' then
                    minuteData.values[key] = (minuteData.values[key] or 0) + value
                    redis.log(redis.LOG_WARNING, "Accumulated " .. key .. ": " .. minuteData.values[key])
                end
            end
            minuteData.count = minuteData.count + 1
            redis.log(redis.LOG_WARNING, "Minute count: " .. minuteData.count)
            
            -- Check if minute is complete
            local minuteComplete = minuteData.count >= samplesPerMinute
            local hourComplete = false
            local hourAvg = {}
            local hourData = {}
            
            if minuteComplete then
                redis.log(redis.LOG_WARNING, "Minute complete!")
                
                -- Calculate minute average
                for key, value in pairs(minuteData.values) do
                    hourAvg[key] = value / minuteData.count
                    redis.log(redis.LOG_WARNING, "Minute avg " .. key .. ": " .. hourAvg[key])
                end
                
                -- Get current hour data
                local hourDataStr = redis.call('GET', hourKey)
                if hourDataStr then
                    hourData = cjson.decode(hourDataStr)
                    redis.log(redis.LOG_WARNING, "Existing hour data: " .. hourDataStr)
                else
                    hourData = {count = 0, values = {}, timestamp = currentTimestamp, total_samples = 0}
                    redis.log(redis.LOG_WARNING, "New hour data created")
                end
                
                -- Accumulate minute averages into hour
                for key, value in pairs(hourAvg) do
                    hourData.values[key] = (hourData.values[key] or 0) + value
                    redis.log(redis.LOG_WARNING, "Hour accumulated " .. key .. ": " .. hourData.values[key])
                end
                hourData.count = hourData.count + 1
                -- Add samples from this minute to total_samples
                hourData.total_samples = (hourData.total_samples or 0) + minuteData.count
                redis.log(redis.LOG_WARNING, "Hour count: " .. hourData.count .. ", Total samples: " .. hourData.total_samples)
                
                -- Check if hour is complete
                hourComplete = hourData.count >= minutesPerHour
                if hourComplete then
                    redis.log(redis.LOG_WARNING, "Hour complete!")
                end
                
                -- Store hour data
                redis.call('SETEX', hourKey, 86400, cjson.encode(hourData))
                
                -- Clear minute data
                redis.call('DEL', minuteKey)
                
                -- Return results
                return {1, hourComplete and 1 or 0, cjson.encode(hourAvg), cjson.encode(hourData)}
            else
                -- Store minute data
                redis.call('SETEX', minuteKey, 3600, cjson.encode(minuteData))
                return {0, 0, "{}", "{}"}
            end
        `;

        // Execute Lua script
        const result = await redisClient.eval(
            luaScript,
            2, // number of keys
            minuteKey,
            hourKey,
            JSON.stringify(data),
            currentTimestamp.toString(),
            SAMPLES_PER_MINUTE.toString(),
            MINUTES_PER_HOUR.toString()
        ) as [number, number, string, string];

        const [minuteComplete, hourComplete, minuteAvgStr, hourDataStr] = result;
        
        // Parse JSON strings back to objects
        const minuteAvg = minuteAvgStr ? JSON.parse(minuteAvgStr) : {};
        const hourData = hourDataStr ? JSON.parse(hourDataStr) : {};

        // Process hour completion asynchronously
        if (hourComplete === 1 && hourData && Object.keys(hourData).length > 0) {
            console.log('Processing hour completion...');
            this.processHourCompletion(serialNumber, hourData, minuteAvg).catch(error => {
                console.error(`Failed to process hour completion for ${serialNumber}:`, error);
            });
        }

        // Broadcast real-time updates
        if (io) {
            io.to(`device:${serialNumber}`).emit('sensor_data_processed', {
                serialNumber,
                minuteComplete: minuteComplete === 1,
                hourComplete: hourComplete === 1,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Xử lý hoàn thành giờ với batch processing
     */
    private async processHourCompletion(serialNumber: string, hourData: HourData, minuteAvg: SensorData) {
        try {
            // Get device info
                const device = await this.prisma.devices.findUnique({
                    where: { serial_number: serialNumber, is_deleted: false },
                select: { serial_number: true, space_id: true }
            });

            if (!device) {
                console.warn(`Device not found: ${serialNumber}`);
                return;
            }

            // Calculate hour average
                const hourAvg: SensorData = {};
                for (const [key, value] of Object.entries(hourData.values)) {
                hourAvg[key] = (value || 0) / hourData.count;
                }

            // Create hourly value record
            console.log('Lưu vào database')
                await this.prisma.hourly_values.create({
                    data: {
                        device_serial: serialNumber,
                    space_id: device.space_id,
                    hour_timestamp: new Date(Math.floor(hourData.timestamp / 3600000) * 3600000),
                        avg_value: hourAvg,
                    sample_count: hourData.total_samples || (hourData.count * SAMPLES_PER_MINUTE),
                    },
                });

            // Clear hour data from Redis
            await redisClient.del(`device:${serialNumber}:hour`);

        } catch (error) {
            console.error(`Error processing hour completion for ${serialNumber}:`, error);
            throw error;
        }
    }

    /**
     * Retry mechanism với exponential backoff
     */
    private async retryWithBackoff<T>(
        operation: () => Promise<T>,
        maxRetries: number,
        delay: number = this.RETRY_DELAY
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                
                if (attempt === maxRetries) {
                    console.error(`Max retries reached for operation:`, lastError.message);
                    throw lastError;
                }

                const backoffDelay = delay * Math.pow(2, attempt);
                console.warn(`Retry attempt ${attempt + 1}/${maxRetries} in ${backoffDelay}ms`);
                
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }

        throw lastError!;
    }

    /**
     * Batch processing cho nhiều thiết bị
     */
    async processBatchSensorData(batchData: Array<{
        serialNumber: string;
        data: {
            gas?: number | undefined;
            temperature?: number | undefined;
            humidity?: number | undefined
        };
    }>) {
        if (batchData.length === 0) return;

        const batches = this.chunkArray(batchData, this.BATCH_SIZE);
        
        for (const batch of batches) {
            await Promise.allSettled(
                batch.map(({ serialNumber, data }) => 
                    this.processSensorData(serialNumber, data)
                )
            );
        }
    }

    /**
     * Chia mảng thành các batch nhỏ hơn
     */
    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Cleanup stale data từ Redis
     */
    async cleanupStaleData() {
        try {
            const pattern = 'device:*:minute';
            const keys = await redisClient.keys(pattern);
            
            if (keys.length === 0) return;

            const now = Date.now();
            const staleKeys: string[] = [];

            // Check for stale minute data (older than 2 hours)
            for (const key of keys) {
                const data = await redisClient.get(key);
                if (data) {
                    const minuteData: MinuteData = JSON.parse(data);
                    if (now - minuteData.timestamp > 7200000) { // 2 hours
                        staleKeys.push(key);
                    }
                }
            }

            // Delete stale keys in batch
            if (staleKeys.length > 0) {
                await redisClient.del(...staleKeys);
                console.log(`Cleaned up ${staleKeys.length} stale minute data keys`);
            }

        } catch (error) {
            console.error('Error cleaning up stale data:', error);
        }
    }

    /**
     * Get statistics với cache optimization
     */
    async getStatistics(device_serial: string, accountId: string, type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom', start_time?: Date, end_time?: Date) {
        await this.checkPermission(device_serial, accountId);
    
        // Cache key for statistics
        const cacheKey = `stats:${device_serial}:${type}:${start_time?.toISOString()}:${end_time?.toISOString()}`;
        
        // Try to get from cache first
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
    
        let groupBy: string;
        let timeColumn: string;
        switch (type) {
            case 'daily':
                groupBy = "DATE(hour_timestamp)";
                timeColumn = "DATE(hour_timestamp)";
                break;
            case 'weekly':
                groupBy = "YEARWEEK(hour_timestamp)";
                timeColumn = "YEARWEEK(hour_timestamp)";
                break;
            case 'monthly':
                groupBy = "DATE_FORMAT(hour_timestamp, '%Y-%m-01')";
                timeColumn = "DATE_FORMAT(hour_timestamp, '%Y-%m-01')";
                break;
            case 'yearly':
                groupBy = "YEAR(hour_timestamp)";
                timeColumn = "YEAR(hour_timestamp)";
                break;
            default:
                groupBy = "hour_timestamp";
                timeColumn = "hour_timestamp";
        }
    
        // Lấy tất cả các key có trong JSON để biết cần tính trung bình cho những field nào
        const keysQuery = await this.prisma.$queryRawUnsafe(`
            SELECT DISTINCT 
                JSON_UNQUOTE(JSON_EXTRACT(JSON_KEYS(avg_value), CONCAT('$[', numbers.n, ']'))) as key_name
            FROM hourly_values
            CROSS JOIN (
                SELECT 0 as n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
            ) numbers
            WHERE device_serial = '${device_serial}'
            AND is_deleted = false 
            ${start_time ? `AND hour_timestamp >= '${start_time.toISOString()}'` : ''} 
            ${end_time ? `AND hour_timestamp <= '${end_time.toISOString()}'` : ''}
            AND numbers.n < JSON_LENGTH(avg_value)
            AND JSON_UNQUOTE(JSON_EXTRACT(JSON_KEYS(avg_value), CONCAT('$[', numbers.n, ']'))) IS NOT NULL
        `) as any;
    
        const keys = keysQuery.map((row: any) => row.key_name).filter(Boolean);
    
        if (keys.length === 0) {
            return [];
        }
    
        // Tạo dynamic query với các field JSON được extract
        const avgFields = keys.map(key => 
            `AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(avg_value, '$.${key}')) AS DECIMAL(10,2))) as avg_${key}`
        ).join(', ');
    
        const query: any[] = await this.prisma.$queryRawUnsafe(`
            SELECT 
                ${timeColumn} as timestamp,
                ${avgFields},
                SUM(sample_count) as total_samples
            FROM hourly_values
            WHERE device_serial = '${device_serial}'
            AND is_deleted = false 
            ${start_time ? `AND hour_timestamp >= '${start_time.toISOString()}'` : ''} 
            ${end_time ? `AND hour_timestamp <= '${end_time.toISOString()}'` : ''}
            GROUP BY ${groupBy}
            ORDER BY ${timeColumn} DESC;
        `);
    
        const result = query.map((row) => {
            // Tạo object avg_value từ các field đã tính trung bình
            const avg_value: any = {};
            keys.forEach(key => {
                if (row[`avg_${key}`] !== null) {
                    avg_value[key] = Number(row[`avg_${key}`]);
                }
            });
    
            return {
                timestamp: row.timestamp,
                avg_value,
                total_samples: Number(row.total_samples),
            };
        });
    
        // Cache result for 5 minutes
        await redisClient.setex(cacheKey, 300, JSON.stringify(result));
    
        return result;
    }
    async createHourlyValue(input: {
        device_serial: string;
        space_id?: number;
        hour_timestamp?: Date;
        avg_value?: SensorData;
        sample_count?: number;
    }): Promise<HourlyValue> {
        const { device_serial, space_id, hour_timestamp, avg_value, sample_count } = input;

        const device = await this.prisma.devices.findUnique({
            where: { serial_number: device_serial, is_deleted: false },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');

        if (space_id) {
            const space = await this.prisma.spaces.findUnique({
                where: { space_id, is_deleted: false },
            });
            if (!space) throwError(ErrorCodes.NOT_FOUND, 'Space not found');
        }

        const hourlyValue = await this.prisma.hourly_values.create({
            data: {
                device_serial,
                space_id,
                hour_timestamp: hour_timestamp || new Date(),
                avg_value,
                sample_count,
            },
        });

        return this.mapPrismaHourlyValueToType(hourlyValue);
    }

    async getHourlyValueById(hourlyValueId: number, accountId: string): Promise<HourlyValue> {
        const hourlyValue = await this.prisma.hourly_values.findUnique({
            where: { hourly_value_id: hourlyValueId, is_deleted: false },
            include: { devices: true },
        });
        if (!hourlyValue) throwError(ErrorCodes.NOT_FOUND, 'Hourly value not found');

        await this.checkPermission(hourlyValue!.device_serial!, accountId);

        return this.mapPrismaHourlyValueToType(hourlyValue);
    }

    async getHourlyValuesByDevice(device_serial: string, accountId: string, filters: {
        start_time?: Date;
        end_time?: Date;
        page: number;
        limit: number
    }): Promise<HourlyValue[]> {
        await this.checkPermission(device_serial, accountId);

        const { start_time, end_time, page, limit } = filters;
        const skip = (page - 1) * limit;

        const hourlyValues = await this.prisma.hourly_values.findMany({
            where: {
                device_serial,
                is_deleted: false,
                hour_timestamp: {
                    gte: start_time,
                    lte: end_time,
                },
            },
            skip,
            take: limit,
            orderBy: { hour_timestamp: 'desc' },
        });

        return hourlyValues.map(this.mapPrismaHourlyValueToType);
    }

    async getHourlyValuesBySpace(space_id: number, accountId: string, filters: {
        start_time?: Date;
        end_time?: Date;
        page: number;
        limit: number
    }): Promise<HourlyValue[]> {
        const space = await this.prisma.spaces.findUnique({
            where: { space_id, is_deleted: false },
            include: { houses: true },
        });
        if (!space) throwError(ErrorCodes.NOT_FOUND, 'Space not found');

        const groupId = space!.houses?.group_id;
        console.log('groupId', groupId)
        if (groupId) {
            const userGroup = await this.prisma.user_groups.findFirst({
                where: { group_id: groupId, account_id: accountId, is_deleted: false },
            });
            if (!userGroup) throwError(ErrorCodes.FORBIDDEN, 'No permission to access this space');
        }

        const { start_time, end_time, page, limit } = filters;
        const skip = (page - 1) * limit;

        const hourlyValues = await this.prisma.hourly_values.findMany({
            where: {
                space_id,
                is_deleted: false,
                hour_timestamp: {
                    gte: start_time,
                    lte: end_time,
                },
            },
            skip,
            take: limit,
            orderBy: { hour_timestamp: 'desc' },
        });

        return hourlyValues.map(this.mapPrismaHourlyValueToType);
    }

    async updateHourlyValue(hourlyValueId: number, input: {
        avg_value?: SensorData;
        sample_count?: number
    }, accountId: string): Promise<HourlyValue> {
        const hourlyValue = await this.prisma.hourly_values.findUnique({
            where: { hourly_value_id: hourlyValueId, is_deleted: false },
            include: { devices: true },
        });
        if (!hourlyValue) throwError(ErrorCodes.NOT_FOUND, 'Hourly value not found');

        await this.checkPermission(hourlyValue!.device_serial!, accountId);

        const updatedHourlyValue = await this.prisma.hourly_values.update({
            where: { hourly_value_id: hourlyValueId },
            data: { avg_value: input.avg_value, sample_count: input.sample_count, updated_at: new Date() },
        });

        return this.mapPrismaHourlyValueToType(updatedHourlyValue);
    }

    async deleteHourlyValue(hourlyValueId: number, accountId: string): Promise<void> {
        const hourlyValue = await this.prisma.hourly_values.findUnique({
            where: { hourly_value_id: hourlyValueId, is_deleted: false },
            include: { devices: true },
        });
        if (!hourlyValue) throwError(ErrorCodes.NOT_FOUND, 'Hourly value not found');

        await this.checkPermission(hourlyValue!.device_serial!, accountId);

        await this.prisma.hourly_values.update({
            where: { hourly_value_id: hourlyValueId },
            data: { is_deleted: true, updated_at: new Date() },
        });
    }

    private async checkPermission(device_serial: string, accountId: string): Promise<void> {
        console.log('device_serial', device_serial);
        const device = await this.prisma.devices.findUnique({
            where: { serial_number: device_serial, is_deleted: false },
            include: { spaces: { include: { houses: true } } },
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');

        if (device!.account_id === accountId) return;

        const groupId = device!.group_id || device!.spaces?.houses?.group_id;
        if (groupId) {
            const userGroup = await this.prisma.user_groups.findFirst({
                where: { group_id: groupId, account_id: accountId, is_deleted: false },
            });
            if (userGroup) return;
        }

        const permission = await this.prisma.shared_permissions.findFirst({
            where: { device_serial, shared_with_user_id: accountId, is_deleted: false },
        });
        if (permission) return;

        throwError(ErrorCodes.FORBIDDEN, 'No permission to access this device');
    }

    private mapPrismaHourlyValueToType(hourlyValue: any): HourlyValue {
        return {
            hourly_value_id: hourlyValue!.hourly_value_id,
            device_serial: hourlyValue!.device_serial,
            space_id: hourlyValue!.space_id,
            hour_timestamp: hourlyValue!.hour_timestamp,
            avg_value: hourlyValue!.avg_value,
            sample_count: hourlyValue!.sample_count,
            created_at: hourlyValue!.created_at,
            updated_at: hourlyValue!.updated_at,
            is_deleted: hourlyValue!.is_deleted,
        };
    }
}

export default HourlyValueService;