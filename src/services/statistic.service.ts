import { PrismaClient } from "@prisma/client";
import prisma from "../config/database";
import queryHelper from "../utils/query.helper";

class StatisticService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma;
    }

    async getStatisticCard(accountId: string) {
        const queryDevices = `
        SELECT 
            CAST(COUNT(DISTINCT device_id) AS UNSIGNED) AS total_devices,
            CAST(COUNT(power_status = TRUE) AS UNSIGNED) AS online_devices
        FROM devices
            LEFT JOIN shared_permissions ON devices.serial_number = shared_permissions.device_serial
        WHERE devices.is_deleted = FALSE
            AND (account_id = ?
            OR shared_with_user_id = ?);
    `
    
        const dataDevices = await queryHelper.queryRaw(queryDevices, [accountId, accountId]);
    
        // Trả về dữ liệu trực tiếp từ query (row đầu tiên)
        return {
            success: true,
            data: dataDevices[0] || { total_devices: 0, online_devices: 0 }
        }
    }
    
    async getStatistic(accountId: string, type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom', start_time?: Date, end_time?: Date) {
        // Query để lấy không gian của user thông qua thiết bị mà user có quyền truy cập
        const queryBySpaces = `
            WITH user_devices AS (
                SELECT DISTINCT
                    d.device_id,
                    d.serial_number,
                    d.power_status,
                    d.space_id,
                    s.space_name,
                    s.space_id as sid,
                    h.house_id,
                    g.group_id
                FROM devices d
                LEFT JOIN shared_permissions sp ON d.serial_number = sp.device_serial
                LEFT JOIN spaces s ON d.space_id = s.space_id
                LEFT JOIN houses h ON s.house_id = h.house_id
                LEFT JOIN \`groups\` g ON h.group_id = g.group_id
                WHERE d.is_deleted = FALSE
                    AND s.is_deleted = FALSE
                    AND h.is_deleted = FALSE
                    AND g.is_deleted = FALSE
                    AND (
                        d.account_id = ?
                        OR sp.shared_with_user_id = ?
                    )
            ),
            space_devices AS (
                SELECT
                    ud.sid as space_id,
                    ud.space_name,
                    COUNT(DISTINCT ud.device_id) AS total_devices,
                    SUM(CASE WHEN ud.power_status = TRUE THEN 1 ELSE 0 END) AS active_devices
                FROM user_devices ud
                WHERE ud.sid IS NOT NULL
                GROUP BY ud.sid, ud.space_name
            )
            
            SELECT
                sd.space_id,
                sd.space_name,
                CAST(sd.total_devices AS UNSIGNED) AS total_devices,
                CAST(sd.active_devices AS UNSIGNED) AS active_devices,
                
                -- Trung bình giá trị môi trường từ hourly_values của 24h gần nhất
                CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(h.avg_value, '$.gas')) AS DECIMAL(10, 4))) AS DECIMAL(10, 2)) AS avg_gas,
                CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(h.avg_value, '$.humidity')) AS DECIMAL(10, 4))) AS DECIMAL(10, 2)) AS avg_humidity,
                CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(h.avg_value, '$.temperature')) AS DECIMAL(10, 4))) AS DECIMAL(10, 2)) AS avg_temperature,
                CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(h.avg_value, '$.power_consumption')) AS DECIMAL(10, 4))) AS DECIMAL(10, 2)) AS avg_power
                
            FROM space_devices sd
            LEFT JOIN hourly_values h ON h.space_id = sd.space_id 
                AND h.is_deleted = FALSE 
                AND h.hour_timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            GROUP BY sd.space_id, sd.space_name, sd.total_devices, sd.active_devices
            ORDER BY sd.space_name;
        `   
    
        const dataBySpaces = await queryHelper.queryRaw(queryBySpaces, [accountId, accountId]);
    
        return {
            success: true,
            data: dataBySpaces
        }
    }

    /**
     * Lấy thống kê theo thời gian cho space
     */
    async getStatisticsBySpace(spaceId: number, accountId: string, type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom', start_time?: Date, end_time?: Date) {
        // Kiểm tra quyền truy cập space
        const checkPermissionQuery = `
            SELECT s.space_id, s.space_name, h.house_id, g.group_id
            FROM spaces s
            LEFT JOIN houses h ON s.house_id = h.house_id
            LEFT JOIN \`groups\` g ON h.group_id = g.group_id
            LEFT JOIN user_groups ug ON g.group_id = ug.group_id
            WHERE s.space_id = ? 
                AND s.is_deleted = FALSE
                AND (ug.account_id = ? OR EXISTS (
                    SELECT 1 FROM devices d 
                    LEFT JOIN shared_permissions sp ON d.serial_number = sp.device_serial
                    WHERE d.space_id = s.space_id 
                        AND d.is_deleted = FALSE
                        AND (d.account_id = ? OR sp.shared_with_user_id = ?)
                ))
        `;
        
        const spacePermission = await queryHelper.queryRaw(checkPermissionQuery, [spaceId, accountId, accountId, accountId]);
        if (!spacePermission.length) {
            throw new Error('Không có quyền truy cập space này');
        }

        // Xây dựng GROUP BY và time column dựa trên type
        let groupBy: string;
        let timeColumn: string;
        let defaultTimeRange = '';
        
        switch (type) {
            case 'daily':
                groupBy = "DATE(hour_timestamp)";
                timeColumn = "DATE(hour_timestamp)";
                defaultTimeRange = start_time ? '' : 'AND hour_timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                break;
            case 'weekly':
                groupBy = "YEARWEEK(hour_timestamp)";
                timeColumn = "YEARWEEK(hour_timestamp)";
                defaultTimeRange = start_time ? '' : 'AND hour_timestamp >= DATE_SUB(NOW(), INTERVAL 4 WEEK)';
                break;
            case 'monthly':
                groupBy = "DATE_FORMAT(hour_timestamp, '%Y-%m-01')";
                timeColumn = "DATE_FORMAT(hour_timestamp, '%Y-%m-01')";
                defaultTimeRange = start_time ? '' : 'AND hour_timestamp >= DATE_SUB(NOW(), INTERVAL 6 MONTH)';
                break;
            case 'yearly':
                groupBy = "YEAR(hour_timestamp)";
                timeColumn = "YEAR(hour_timestamp)";
                defaultTimeRange = start_time ? '' : 'AND hour_timestamp >= DATE_SUB(NOW(), INTERVAL 3 YEAR)';
                break;
            default:
                groupBy = "hour_timestamp";
                timeColumn = "hour_timestamp";
                defaultTimeRange = start_time ? '' : 'AND hour_timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
        }

        // Lấy tất cả các key có trong JSON avg_value
        const keysQuery = `
            SELECT DISTINCT 
                JSON_UNQUOTE(JSON_EXTRACT(JSON_KEYS(avg_value), CONCAT('$[', numbers.n, ']'))) as key_name
            FROM hourly_values
            CROSS JOIN (
                SELECT 0 as n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
            ) numbers
            WHERE space_id = ?
            AND is_deleted = FALSE 
            ${start_time ? 'AND hour_timestamp >= ?' : ''}
            ${end_time ? 'AND hour_timestamp <= ?' : ''}
            ${defaultTimeRange}
            AND numbers.n < JSON_LENGTH(avg_value)
            AND JSON_UNQUOTE(JSON_EXTRACT(JSON_KEYS(avg_value), CONCAT('$[', numbers.n, ']'))) IS NOT NULL
        `;

        const queryParams = [spaceId];
        if (start_time) queryParams.push(start_time.getTime());
        if (end_time) queryParams.push(end_time.getTime());
        
        const keysResult = await queryHelper.queryRaw(keysQuery, queryParams);
        const keys = keysResult.map((row: any) => row.key_name).filter(Boolean);

        if (keys.length === 0) {
            return {
                success: true,
                data: []
            };
        }

        // Tạo dynamic query với các field JSON được extract
        const avgFields = keys.map(key => 
            `AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(avg_value, '$.${key}')) AS DECIMAL(10,4))) as ${key}`
        ).join(', ');

        const statsQuery = `
            SELECT 
                ${timeColumn} as timestamp,
                ${avgFields},
                SUM(sample_count) as total_samples,
                COUNT(DISTINCT device_serial) as active_devices
            FROM hourly_values
            WHERE space_id = ?
            AND is_deleted = FALSE 
            ${start_time ? 'AND hour_timestamp >= ?' : ''}
            ${end_time ? 'AND hour_timestamp <= ?' : ''}
            ${defaultTimeRange}
            GROUP BY ${groupBy}
            ORDER BY ${timeColumn} DESC
            LIMIT 50
        `;

        const statsResult = await queryHelper.queryRaw(statsQuery, queryParams);

        const transformedData = statsResult.map((row: any) => {
            // Tạo object avg_value từ các field đã tính trung bình
            const avg_value: any = {};
            keys.forEach(key => {
                if (row[key] !== null && row[key] !== undefined) {
                    avg_value[key] = Number(row[key]);
                }
            });

            return {
                timestamp: row.timestamp,
                avg_value,
                total_samples: Number(row.total_samples || 0),
                active_devices: Number(row.active_devices || 0),
            };
        });

        return {
            success: true,
            data: transformedData
        };
    }

    /**
     * Lấy thống kê theo thời gian cho device
     */
    async getStatisticsByDevice(deviceSerial: string, accountId: string, type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom', start_time?: Date, end_time?: Date) {
        // Kiểm tra quyền truy cập device
        const checkPermissionQuery = `
            SELECT d.serial_number, d.device_id, d.space_id
            FROM devices d
            LEFT JOIN shared_permissions sp ON d.serial_number = sp.device_serial
            LEFT JOIN spaces s ON d.space_id = s.space_id
            LEFT JOIN houses h ON s.house_id = h.house_id
            LEFT JOIN \`groups\` g ON h.group_id = g.group_id
            LEFT JOIN user_groups ug ON g.group_id = ug.group_id
            WHERE d.serial_number = ? 
                AND d.is_deleted = FALSE
                AND (
                    d.account_id = ? 
                    OR sp.shared_with_user_id = ?
                    OR ug.account_id = ?
                )
        `;
        
        const devicePermission = await queryHelper.queryRaw(checkPermissionQuery, [deviceSerial, accountId, accountId, accountId]);
        if (!devicePermission.length) {
            throw new Error('Không có quyền truy cập device này');
        }

        // Xây dựng GROUP BY và time column dựa trên type
        let groupBy: string;
        let timeColumn: string;
        let defaultTimeRange = '';
        
        switch (type) {
            case 'daily':
                groupBy = "DATE(hour_timestamp)";
                timeColumn = "DATE(hour_timestamp)";
                defaultTimeRange = start_time ? '' : 'AND hour_timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                break;
            case 'weekly':
                groupBy = "YEARWEEK(hour_timestamp)";
                timeColumn = "YEARWEEK(hour_timestamp)";
                defaultTimeRange = start_time ? '' : 'AND hour_timestamp >= DATE_SUB(NOW(), INTERVAL 4 WEEK)';
                break;
            case 'monthly':
                groupBy = "DATE_FORMAT(hour_timestamp, '%Y-%m-01')";
                timeColumn = "DATE_FORMAT(hour_timestamp, '%Y-%m-01')";
                defaultTimeRange = start_time ? '' : 'AND hour_timestamp >= DATE_SUB(NOW(), INTERVAL 6 MONTH)';
                break;
            case 'yearly':
                groupBy = "YEAR(hour_timestamp)";
                timeColumn = "YEAR(hour_timestamp)";
                defaultTimeRange = start_time ? '' : 'AND hour_timestamp >= DATE_SUB(NOW(), INTERVAL 3 YEAR)';
                break;
            default:
                groupBy = "hour_timestamp";
                timeColumn = "hour_timestamp";
                defaultTimeRange = start_time ? '' : 'AND hour_timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
        }

        // Lấy tất cả các key có trong JSON avg_value
        const keysQuery = `
            SELECT DISTINCT 
                JSON_UNQUOTE(JSON_EXTRACT(JSON_KEYS(avg_value), CONCAT('$[', numbers.n, ']'))) as key_name
            FROM hourly_values
            CROSS JOIN (
                SELECT 0 as n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
            ) numbers
            WHERE device_serial = ?
            AND is_deleted = FALSE 
            ${start_time ? 'AND hour_timestamp >= ?' : ''}
            ${end_time ? 'AND hour_timestamp <= ?' : ''}
            ${defaultTimeRange}
            AND numbers.n < JSON_LENGTH(avg_value)
            AND JSON_UNQUOTE(JSON_EXTRACT(JSON_KEYS(avg_value), CONCAT('$[', numbers.n, ']'))) IS NOT NULL
        `;

        const queryParams = [deviceSerial];
        if (start_time) queryParams.push(start_time.toISOString());
        if (end_time) queryParams.push(end_time.toISOString());
        
        const keysResult = await queryHelper.queryRaw(keysQuery, queryParams);
        const keys = keysResult.map((row: any) => row.key_name).filter(Boolean);

        if (keys.length === 0) {
            return {
                success: true,
                data: []
            };
        }

        // Tạo dynamic query với các field JSON được extract
        const avgFields = keys.map(key => 
            `AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(avg_value, '$.${key}')) AS DECIMAL(10,4))) as ${key}`
        ).join(', ');

        const statsQuery = `
            SELECT 
                ${timeColumn} as timestamp,
                ${avgFields},
                SUM(sample_count) as total_samples
            FROM hourly_values
            WHERE device_serial = ?
            AND is_deleted = FALSE 
            ${start_time ? 'AND hour_timestamp >= ?' : ''}
            ${end_time ? 'AND hour_timestamp <= ?' : ''}
            ${defaultTimeRange}
            GROUP BY ${groupBy}
            ORDER BY ${timeColumn} DESC
            LIMIT 50
        `;

        const statsResult = await queryHelper.queryRaw(statsQuery, queryParams);

        const transformedData = statsResult.map((row: any) => {
            // Tạo object avg_value từ các field đã tính trung bình
            const avg_value: any = {};
            keys.forEach(key => {
                if (row[key] !== null && row[key] !== undefined) {
                    avg_value[key] = Number(row[key]);
                }
            });

            return {
                timestamp: row.timestamp,
                avg_value,
                total_samples: Number(row.total_samples || 0),
            };
        });

        return {
            success: true,
            data: transformedData
        };
    }

    /**
     * Lấy danh sách thiết bị trong space mà user có quyền truy cập
     */
    async getDevicesInSpace(spaceId: number, accountId: string) {
        const queryDevicesInSpace = `
            SELECT 
                d.device_id,
                d.serial_number as serial,
                d.name,
                d.power_status,
                sp.permission_type
            FROM devices d
            LEFT JOIN shared_permissions sp ON d.serial_number = sp.device_serial
            LEFT JOIN spaces s ON d.space_id = s.space_id
            LEFT JOIN houses h ON s.house_id = h.house_id
            LEFT JOIN \`groups\` g ON h.group_id = g.group_id
            WHERE d.is_deleted = FALSE
                AND s.is_deleted = FALSE
                AND h.is_deleted = FALSE
                AND g.is_deleted = FALSE
                AND d.space_id = ?
                AND (
                    d.account_id = ?
                    OR sp.shared_with_user_id = ?
                )
            ORDER BY d.name, d.serial_number;
        `;

        const devices = await queryHelper.queryRaw(queryDevicesInSpace, [spaceId, accountId, accountId]);
        
        return {
            success: true,
            data: devices
        };
    }
}

export default StatisticService;