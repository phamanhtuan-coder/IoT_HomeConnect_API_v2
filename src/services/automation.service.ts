import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import DeviceLinksService, { setSocketInstance } from './device-links.service';

export interface SensorData {
    serialNumber: string;
    gas?: number;
    temperature?: number;
    humidity?: number;
    smoke_level?: number;
    flame_detected?: boolean;
    alarmActive?: boolean;
    [key: string]: any;
}

class AutomationService {
    private prisma: PrismaClient;
    private deviceLinksService: DeviceLinksService;
    private io: Server | null = null;

    constructor() {
        this.prisma = new PrismaClient();
        this.deviceLinksService = new DeviceLinksService();
    }

    setSocketInstance(io: Server) {
        this.io = io;
        setSocketInstance(io);
    }

    /**
     * Kiểm tra và trigger automation khi nhận sensor data
     */
    async checkAndTriggerAutomation(sensorData: SensorData): Promise<void> {
        try {
            console.log(`🔍 [Automation] Checking automation for device: ${sensorData.serialNumber}`);
            console.log(`📊 [Automation] Sensor data:`, sensorData);

            // 1. Tìm device_id từ serial_number
            const device = await this.prisma.devices.findFirst({
                where: {
                    serial_number: sensorData.serialNumber,
                    is_deleted: false
                },
                select: {
                    device_id: true,
                    name: true
                }
            });

            if (!device) {
                console.log(`❌ [Automation] Device not found: ${sensorData.serialNumber}`);
                return;
            }

            console.log(`✅ [Automation] Found device: ${device.name} (${device.device_id})`);

            // 2. Chuyển đổi sensor data thành current_value format
            const currentValue = this.convertSensorDataToCurrentValue(sensorData);
            console.log(`📊 [Automation] Converted current_value:`, JSON.stringify(currentValue, null, 2));

            // 3. Gọi processDeviceLinks có sẵn
            await this.deviceLinksService.processDeviceLinks(device.device_id, currentValue);

        } catch (error) {
            console.error('❌ [Automation] Error checking automation:', error);
            throw error;
        }
    }

    /**
     * Chuyển đổi sensor data thành current_value format
     */
    private convertSensorDataToCurrentValue(sensorData: SensorData): any[] {
        const currentValue: any[] = [];

        // Map sensor fields to component structure
        const fieldMappings = [
            {
                field: 'gas',
                componentId: 'COMP10JUN2501JXCB3S21G8F882YX79E', // Component ID cho gas sensor
                name: 'Cảm biến chất lượng',
                datatype: 'NUMBER',
                unit: 'ppm'
            },
            {
                field: 'temperature',
                componentId: 'COMP10JUN2501JXCB3S21G8F882YX79E', // Component ID cho temperature
                name: 'Cảm biến nhiệt độ',
                datatype: 'NUMBER',
                unit: '°C'
            },
            {
                field: 'humidity',
                componentId: 'COMP10JUN2501JXCB3S21G8F882YX79E', // Component ID cho humidity
                name: 'Cảm biến độ ẩm',
                datatype: 'NUMBER',
                unit: '%'
            },
            {
                field: 'smoke_level',
                componentId: 'COMP10JUN2501JXCB3S21G8F882YX79E', // Component ID cho smoke
                name: 'Cảm biến khói',
                datatype: 'NUMBER',
                unit: 'ppm'
            }
        ];

        // Tạo component cho từng field có dữ liệu
        for (const mapping of fieldMappings) {
            const value = sensorData[mapping.field];
            if (value !== undefined && value !== null) {
                currentValue.push({
                    component_id: mapping.componentId,
                    name: mapping.name,
                    datatype: mapping.datatype,
                    unit: mapping.unit,
                    instances: [
                        {
                            index: `sensor_01`, // Default instance index
                            value: value
                        }
                    ]
                });
            }
        }

        // Thêm alarm status nếu có
        if (sensorData.alarmActive !== undefined) {
            currentValue.push({
                component_id: 'COMP10JUN2501JXCB3S21G8F882YX79E',
                name: 'Trạng thái báo động',
                datatype: 'BOOLEAN',
                unit: '',
                instances: [
                    {
                        index: `alarm_01`,
                        value: sensorData.alarmActive ? 1 : 0
                    }
                ]
            });
        }

        return currentValue;
    }

    /**
     * Test automation với dữ liệu giả
     */
    async testAutomation(inputSerial: string, testData: SensorData): Promise<void> {
        console.log(`🧪 [Automation] Testing automation for device: ${inputSerial}`);
        console.log(`📊 [Automation] Test data:`, testData);
        
        await this.checkAndTriggerAutomation(testData);
    }

    /**
     * Lấy thông tin device links cho một device
     */
    async getDeviceLinksInfo(serialNumber: string): Promise<any> {
        try {
            const device = await this.prisma.devices.findFirst({
                where: {
                    serial_number: serialNumber,
                    is_deleted: false
                },
                select: {
                    device_id: true,
                    name: true
                }
            });

            if (!device) {
                return { error: 'Device not found' };
            }

            // Lấy input links
            const inputLinks = await this.prisma.device_links.findMany({
                where: {
                    input_device_id: device.device_id,
                    deleted_at: null
                },
                include: {
                    output_device: {
                        select: {
                            device_id: true,
                            serial_number: true,
                            name: true
                        }
                    }
                }
            });

            // Lấy output links
            const outputLinks = await this.prisma.device_links.findMany({
                where: {
                    output_device_id: device.device_id,
                    deleted_at: null
                },
                include: {
                    input_device: {
                        select: {
                            device_id: true,
                            serial_number: true,
                            name: true
                        }
                    }
                }
            });

            return {
                device: {
                    device_id: device.device_id,
                    name: device.name,
                    serial_number: serialNumber
                },
                input_links: inputLinks,
                output_links: outputLinks
            };

        } catch (error) {
            console.error('Error getting device links info:', error);
            return { error: 'Internal server error' };
        }
    }
}

export default new AutomationService(); 