import {PrismaClient} from '@prisma/client';
import {ErrorCodes, throwError} from '../utils/errors';
import redisClient from '../utils/redis';
import {Server} from 'socket.io';
import {HourlyValue} from "../types/hourly-value";
import {Prisma} from "@prisma/client/extension";
import prisma from "../config/database";

const MINUTE_INTERVAL = 10; // 10 seconds per sample
const SAMPLES_PER_MINUTE = 6; // 60 seconds / 10 seconds
const MINUTES_PER_HOUR = 60;

interface SensorData {
    [key: string]: number | null;
}

export function setSocketInstance(socket: Server) {
    io = socket;
}

let io: Server | null = null;

class HourlyValueService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma
    }

    // Aggregate minute data and store in Redis
    async processSensorData(deviceId: string, data: {
        gas: number | undefined;
        temperature: number | undefined;
        humidity: number | undefined
    }) {
        const minuteKey = `device:${deviceId}:minute`;
        const hourKey = `device:${deviceId}:hour`;

        // Get or initialize minute data
        let minuteData: { count: number; values: SensorData } = (await redisClient.get(minuteKey))
            ? JSON.parse(<string>await redisClient.get(minuteKey)!)
            : {count: 0, values: {}};

        // Accumulate values
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'number') {
                minuteData.values[key] = (minuteData.values[key] || 0) + value;
            }
        }
        minuteData.count += 1;

        // Store minute data
        await redisClient.set(minuteKey, JSON.stringify(minuteData), 'EX', 3600);

        // Check if minute is complete
        if (minuteData.count >= SAMPLES_PER_MINUTE) {
            const minuteAvg: SensorData = {};
            for (const [key, value] of Object.entries(minuteData.values)) {
                // @ts-ignore
                minuteAvg[key] = value / minuteData.count;
            }

            // Get or initialize hour data
            let hourData: { count: number; values: SensorData } = (await redisClient.get(hourKey))
                ? JSON.parse(<string>await redisClient.get(hourKey)!)
                : {count: 0, values: {}};

            // Accumulate minute averages into hour
            for (const [key, value] of Object.entries(minuteAvg)) {
                // @ts-ignore
                hourData.values[key] = (hourData.values[key] || 0) + value;
            }
            hourData.count += 1;

            // Store hour data
            await redisClient.set(hourKey, JSON.stringify(hourData), 'EX', 86400);

            // Clear minute data
            await redisClient.del(minuteKey);

            // Check if hour is complete
            if (hourData.count >= MINUTES_PER_HOUR) {
                const device = await this.prisma.devices.findUnique({
                    where: {serial_number: deviceId, is_deleted: false},
                });
                if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');

                const hourAvg: SensorData = {};
                for (const [key, value] of Object.entries(hourData.values)) {
                    // @ts-ignore
                    hourAvg[key] = value / hourData.count;
                }

                // Save to hourly_values
                await this.prisma.hourly_values.create({
                    data: {
                        device_serial: deviceId,
                        space_id: device!.space_id,
                        hour_timestamp: new Date(Math.floor(Date.now() / 3600000) * 3600000), // Start of current hour
                        avg_value: hourAvg,
                        sample_count: hourData.count * minuteData.count,
                    },
                });

                // Clear hour data
                await redisClient.del(hourKey);
            }
        }
    }

    async createHourlyValue(input: {
        device_serial: string;
        space_id?: number;
        hour_timestamp?: Date;
        avg_value?: SensorData;
        sample_count?: number;
    }): Promise<HourlyValue> {
        const {device_serial, space_id, hour_timestamp, avg_value, sample_count} = input;

        const device = await this.prisma.devices.findUnique({
            where: {serial_number: device_serial, is_deleted: false},
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');

        if (space_id) {
            const space = await this.prisma.spaces.findUnique({
                where: {space_id, is_deleted: false},
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
            where: {hourly_value_id: hourlyValueId, is_deleted: false},
            include: {devices: true},
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

        const {start_time, end_time, page, limit} = filters;
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
            orderBy: {hour_timestamp: 'desc'},
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
            where: {space_id, is_deleted: false},
            include: {houses: true},
        });
        if (!space) throwError(ErrorCodes.NOT_FOUND, 'Space not found');

        const groupId = space!.houses?.group_id;
        if (groupId) {
            const userGroup = await this.prisma.user_groups.findFirst({
                where: {group_id: groupId, account_id: accountId, is_deleted: false},
            });
            if (!userGroup) throwError(ErrorCodes.FORBIDDEN, 'No permission to access this space');
        }

        const {start_time, end_time, page, limit} = filters;
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
            orderBy: {hour_timestamp: 'desc'},
        });

        return hourlyValues.map(this.mapPrismaHourlyValueToType);
    }

    async updateHourlyValue(hourlyValueId: number, input: {
        avg_value?: SensorData;
        sample_count?: number
    }, accountId: string): Promise<HourlyValue> {
        const hourlyValue = await this.prisma.hourly_values.findUnique({
            where: {hourly_value_id: hourlyValueId, is_deleted: false},
            include: {devices: true},
        });
        if (!hourlyValue) throwError(ErrorCodes.NOT_FOUND, 'Hourly value not found');

        await this.checkPermission(hourlyValue!.device_serial!, accountId);

        const updatedHourlyValue = await this.prisma.hourly_values.update({
            where: {hourly_value_id: hourlyValueId},
            data: {avg_value: input.avg_value, sample_count: input.sample_count, updated_at: new Date()},
        });

        return this.mapPrismaHourlyValueToType(updatedHourlyValue);
    }

    async deleteHourlyValue(hourlyValueId: number, accountId: string): Promise<void> {
        const hourlyValue = await this.prisma.hourly_values.findUnique({
            where: {hourly_value_id: hourlyValueId, is_deleted: false},
            include: {devices: true},
        });
        if (!hourlyValue) throwError(ErrorCodes.NOT_FOUND, 'Hourly value not found');

        await this.checkPermission(hourlyValue!.device_serial!, accountId);

        await this.prisma.hourly_values.update({
            where: {hourly_value_id: hourlyValueId},
            data: {is_deleted: true, updated_at: new Date()},
        });
    }

    // Aggregate statistics (daily, weekly, monthly, yearly, or custom range)
    async getStatistics(device_serial: string, accountId: string, type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom', start_time?: Date, end_time?: Date) {
        await this.checkPermission(device_serial, accountId);

        let groupBy: string;
        switch (type) {
            case 'daily':
                groupBy = "DATE_TRUNC('day', hour_timestamp)";
                break;
            case 'weekly':
                groupBy = "DATE_TRUNC('week', hour_timestamp)";
                break;
            case 'monthly':
                groupBy = "DATE_TRUNC('month', hour_timestamp)";
                break;
            case 'yearly':
                groupBy = "DATE_TRUNC('year', hour_timestamp)";
                break;
            default:
                groupBy = "DATE_TRUNC('hour', hour_timestamp)";
        }

        const query: any[] = await this.prisma.$queryRawUnsafe(`
            SELECT ${type !== 'custom' ? `DATE_TRUNC('${type}', hour_timestamp)` : `hour_timestamp as timestamp`},
                   jsonb_object_agg(
                       key, CASE
                                WHEN jsonb_typeof(avg_value - > key) = 'number' THEN AVG((avg_value ->> key)::numeric)
                                ELSE NULL
                       END
                   ) as                 avg_value,
                   SUM(sample_count) as total_samples
            FROM hourly_values, jsonb_object_keys(avg_value) as key
            WHERE device_serial = '${device_serial}'
              AND is_deleted = false ${start_time ? `AND hour_timestamp >= '${start_time.toISOString()}'` : ''} ${end_time ? `AND hour_timestamp <= '${end_time.toISOString()}'` : ''}
            GROUP BY ${groupBy};
        `);

        return query.map((row) => ({
            timestamp: row.timestamp,
            avg_value: row.avg_value,
            total_samples: Number(row.total_samples),
        }));
    }

    private async checkPermission(device_serial: string, accountId: string): Promise<void> {
        const device = await this.prisma.devices.findUnique({
            where: {serial_number: device_serial, is_deleted: false},
            include: {spaces: {include: {houses: true}}},
        });
        if (!device) throwError(ErrorCodes.NOT_FOUND, 'Device not found');

        if (device!.account_id === accountId) return;

        const groupId = device!.group_id || device!.spaces?.houses?.group_id;
        if (groupId) {
            const userGroup = await this.prisma.user_groups.findFirst({
                where: {group_id: groupId, account_id: accountId, is_deleted: false},
            });
            if (userGroup) return;
        }

        const permission = await this.prisma.shared_permissions.findFirst({
            where: {device_serial, shared_with_user_id: accountId, is_deleted: false},
        });
        if (permission) return;

        throwError(ErrorCodes.FORBIDDEN, 'No permission to access this device.ts');
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

