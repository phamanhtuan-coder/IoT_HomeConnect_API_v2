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
    
        const queryBySpaces = `
            WITH device_list AS (
            SELECT
                d.device_id,
                d.power_status,
                d.space_id,
                d.account_id
            FROM devices d
            LEFT JOIN shared_permissions sp ON d.serial_number = sp.device_serial
            WHERE d.is_deleted = FALSE
                AND (
                d.account_id = ?
                OR sp.shared_with_user_id = ?
                )
            )
    
            SELECT
                s.space_id,
                s.space_name,
                s.icon_color,
                s.icon_name,
                CAST(COUNT(DISTINCT dl.device_id) AS UNSIGNED) AS total_devices,
                CAST(SUM(CASE WHEN dl.power_status = TRUE THEN 1 ELSE 0 END) AS UNSIGNED) AS active_devices,
                -- Trung bình giá trị môi trường (tính riêng)
                CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(h.avg_value, '$.gas')) AS DECIMAL(10, 4))) AS DECIMAL(10, 2)) AS avg_gas,
                CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(h.avg_value, '$.humidity')) AS DECIMAL(10, 4))) AS DECIMAL(10, 2)) AS avg_humidity,
                CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(h.avg_value, '$.temperature')) AS DECIMAL(10, 4))) AS DECIMAL(10, 2)) AS avg_temperature,
                CAST(AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(h.avg_value, '$.power_consumption')) AS DECIMAL(10, 4))) AS DECIMAL(10, 2)) AS avg_power
            FROM spaces s
            LEFT JOIN device_list dl ON dl.space_id = s.space_id
            LEFT JOIN hourly_values h ON h.space_id = s.space_id AND h.is_deleted = FALSE
    
            WHERE s.is_deleted = FALSE
            GROUP BY s.space_id, s.space_name;
        `   
    
        const dataBySpaces = await queryHelper.queryRaw(queryBySpaces, [accountId, accountId]);
    
        return {
            success: true,
            data: dataBySpaces
        }
    }
}

export default StatisticService;    