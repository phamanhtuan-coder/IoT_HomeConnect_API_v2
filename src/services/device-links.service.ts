import { PrismaClient } from '@prisma/client';
import { throwError, ErrorCodes } from '../utils/errors';
import { Server } from 'socket.io';

let io: Server | null = null;

export function setSocketInstance(socket: Server) {
    io = socket;
}

export interface DeviceLinkInput {
    input_device_id: string;
    output_device_id: string;
    value_active: string;
    logic_operator?: 'AND' | 'OR';
    component_id?: string;
    output_action?: 'turn_on' | 'turn_off';
    output_value?: string; // Thêm field để set giá trị cho output
}

export interface DeviceLinkUpdate {
    value_active?: string;
    logic_operator?: 'AND' | 'OR';
    component_id?: string;
    output_action?: 'turn_on' | 'turn_off';
    output_value?: string; // Thêm field để set giá trị cho output
}

export interface DeviceLink {
    id: number;
    input_device_id: string;
    output_device_id: string;
    component_id: string;
    value_active: string;
    logic_operator: 'AND' | 'OR';
    output_action: 'turn_on' | 'turn_off';
    output_value?: string; // Thêm field để set giá trị cho output
    created_at: Date | null;
    updated_at: Date | null;
    deleted_at: Date | null;
    input_device?: any;
    output_device?: any;
    component?: any;
}

// Predefined output values (dữ liệu cứng theo yêu cầu)
export const PREDEFINED_OUTPUT_VALUES = {
    light_brightness: [
        { label: 'Độ sáng thấp (25%)', value: '25' },
        { label: 'Độ sáng trung bình (50%)', value: '50' },
        { label: 'Độ sáng cao (75%)', value: '75' },
        { label: 'Độ sáng tối đa (100%)', value: '100' }
    ],
    alert_mode: [
        { label: 'Cảnh báo nhẹ', value: 'low_alert' },
        { label: 'Cảnh báo trung bình', value: 'medium_alert' },
        { label: 'Cảnh báo cao', value: 'high_alert' },
        { label: 'Cảnh báo khẩn cấp', value: 'emergency_alert' }
    ]
};

class DeviceLinksService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * Tạo liên kết mới giữa các thiết bị
     */
    async createDeviceLink(input: DeviceLinkInput, accountId: string): Promise<DeviceLink> {
        // Kiểm tra quyền truy cập cả input và output device
        await this.checkDevicePermission(input.input_device_id, accountId);
        await this.checkDevicePermission(input.output_device_id, accountId);

        // Kiểm tra device tồn tại
        const inputDevice = await this.prisma.devices.findFirst({
            where: { device_id: input.input_device_id, is_deleted: false }
        });
        const outputDevice = await this.prisma.devices.findFirst({
            where: { device_id: input.output_device_id, is_deleted: false }
        });

        if (!inputDevice) throwError(ErrorCodes.NOT_FOUND, "Input device not found");
        if (!outputDevice) throwError(ErrorCodes.NOT_FOUND, "Output device not found");

        // Không cho phép tự liên kết với chính nó
        if (input.input_device_id === input.output_device_id) {
            throwError(ErrorCodes.BAD_REQUEST, "Device cannot link to itself");
        }

        // Kiểm tra link đã tồn tại
        const existingLink = await this.prisma.device_links.findFirst({
            where: {
                input_device_id: input.input_device_id,
                output_device_id: input.output_device_id,
                component_id: input.component_id,
                deleted_at: null
            }
        });

        if (existingLink) {
            throwError(ErrorCodes.BAD_REQUEST, "Device link already exists");
        }

        const deviceLink = await this.prisma.device_links.create({
            data: {
                input_device_id: input.input_device_id,
                output_device_id: input.output_device_id,
                component_id: input.component_id || '',
                value_active: input.value_active,
                logic_operator: input.logic_operator || 'AND',
                output_action: input.output_action || 'turn_on',
                output_value: input.output_value || '', // Thêm output_value
                created_at: new Date(),
                updated_at: new Date()
            },
            include: {
                input_device: true,
                output_device: true
            }
        });

        return this.mapPrismaDeviceLinkToDeviceLink(deviceLink);
    }

    /**
     * Lấy tất cả links của một account
     */
    async getDeviceLinksByAccount(accountId: string): Promise<DeviceLink[]> {
        // Lấy tất cả device của account
        const userDevices = await this.prisma.devices.findMany({
            where: { account_id: accountId, is_deleted: false },
            select: { device_id: true }
        });

        const deviceIds = userDevices.map(d => d.device_id);

        const links = await this.prisma.device_links.findMany({
            where: {
                OR: [
                    { input_device_id: { in: deviceIds } },
                    { output_device_id: { in: deviceIds } }
                ],
                deleted_at: null
            },
            include: {
                input_device: {
                    select: {
                        device_id: true,
                        serial_number: true,
                        name: true,
                        current_value: true
                    }
                },
                output_device: {
                    select: {
                        device_id: true,
                        serial_number: true,
                        name: true,
                        power_status: true,
                        attribute: true
                    }
                },
                component: {
                    select: {
                        component_id: true,
                        name: true,
                        datatype: true,
                        unit: true,
                        flow_type: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        return links.map(link => this.mapPrismaDeviceLinkToDeviceLink(link));
    }

    /**
     * Lấy links theo output device
     */
    async getLinksByOutputDevice(outputDeviceId: string): Promise<DeviceLink[]> {
        const links = await this.prisma.device_links.findMany({
            where: {
                output_device_id: outputDeviceId,
                deleted_at: null
            },
            include: {
                input_device: {
                    select: {
                        device_id: true,
                        serial_number: true,
                        name: true,
                        current_value: true
                    }
                },
                output_device: {
                    select: {
                        device_id: true,
                        serial_number: true,
                        name: true,
                        power_status: true,
                        attribute: true
                    }
                },
                component: {
                    select: {
                        component_id: true,
                        name: true,
                        datatype: true,
                        unit: true,
                        flow_type: true
                    }
                }
            }
        });

        return links.map(link => this.mapPrismaDeviceLinkToDeviceLink(link));
    }

    /**
     * Cập nhật device link
     */
    async updateDeviceLink(linkId: number, input: DeviceLinkUpdate, accountId: string): Promise<DeviceLink> {
        const existingLink = await this.prisma.device_links.findFirst({
            where: { id: linkId, deleted_at: null }
        });

        if (!existingLink) {
            throwError(ErrorCodes.NOT_FOUND, "Device link not found");
        }

        // Kiểm tra quyền truy cập
        await this.checkDevicePermission(existingLink!.input_device_id, accountId);
        await this.checkDevicePermission(existingLink!.output_device_id, accountId);

        const updatedLink = await this.prisma.device_links.update({
            where: { id: linkId },
            data: {
                ...input,
                updated_at: new Date()
            },
            include: {
                input_device: true,
                output_device: true
            }
        });

        return this.mapPrismaDeviceLinkToDeviceLink(updatedLink);
    }

    /**
     * Xóa device link
     */
    async deleteDeviceLink(linkId: number, accountId: string): Promise<void> {
        try {
            const existingLink = await this.prisma.device_links.findFirst({
                where: { id: linkId, deleted_at: null }
            });

            if (!existingLink) {
                throwError(ErrorCodes.NOT_FOUND, "Device link not found");
            }

            // Kiểm tra quyền truy cập
            await this.checkDevicePermission(existingLink!.input_device_id, accountId);
            await this.checkDevicePermission(existingLink!.output_device_id, accountId);

            await this.prisma.device_links.update({
                where: { id: linkId },
                data: {
                    deleted_at: new Date()
                }
            });

            return;
        } catch (error) {
            throwError(ErrorCodes.NOT_FOUND, "Xoá liên kết thất bại");
        }
        

    }

    /**
     * Xử lý automation trigger cho sensorData: so sánh từng thuộc tính với value_active trong device_link
     * Nếu đạt đủ điều kiện (AND/OR) thì trigger output
     */
    async processDeviceLinks(deviceId: string, sensorData: any): Promise<void> {
        try {
            console.log('sensorData', sensorData)
            // Lấy tất cả device_links cho input_device_id này
            const deviceLinks = await this.prisma.device_links.findMany({
                where: { input_device_id: deviceId, deleted_at: null },
                include: { output_device: true }
            });

            console.log('deviceLinks', deviceLinks)
            if (!deviceLinks.length) return;

            // Group theo output_device_id
            const linksByOutput: { [outputId: string]: any[] } = {};
            console.log('linksByOutput - before', linksByOutput)
            for (const link of deviceLinks) {
                if (!linksByOutput[link.output_device_id]) linksByOutput[link.output_device_id] = [];
                linksByOutput[link.output_device_id].push(link);
            }

            console.log('linksByOutput - result', linksByOutput)

            for (const [outputDeviceId, links] of Object.entries(linksByOutput)) {
                let shouldTrigger = true;
                let hasOr = false;
                let orResult = false;
                for (const link of links) {
                    const field = link.component_id; // component_id là tên field (ví dụ: gas, temp, humidity)
                    const valueActive = link.value_active;
                    const value = sensorData[field];
                    
                    if (link.logic_operator === 'OR') {
                        hasOr = true;
                        orResult = orResult || this.compareValue(value, valueActive);
                        console.log('OrResult:', orResult)
                    } else {
                        // AND logic
                        if (!this.compareValue(value, valueActive)) {
                            shouldTrigger = false;
                            break;
                        }
                    }
                }
                if ((hasOr && orResult) || (!hasOr && shouldTrigger)) {
                    // Trigger output: lấy output_value của dòng đầu tiên (hoặc customize theo nhu cầu)
                    await this.triggerOutputDevice(links[0]);
                }
            }
        } catch (error) {
            console.error('❌ [DeviceLinks] Error processing device links:', error);
        }
    }

    /**
     * So sánh giá trị sensor với value_active (hỗ trợ >, >=, <, <=, ==)
     */
    private compareValue(value: any, valueActive: string): boolean {
        if (value === undefined || value === null) return false;
        if (typeof valueActive === 'string') {
            if (valueActive.startsWith('>=')) return value >= parseFloat(valueActive.slice(2));
            if (valueActive.startsWith('>')) return value > parseFloat(valueActive.slice(1));
            if (valueActive.startsWith('<=')) return value <= parseFloat(valueActive.slice(2));
            if (valueActive.startsWith('<')) return value < parseFloat(valueActive.slice(1));
            if (valueActive.startsWith('==')) return value == parseFloat(valueActive.slice(2));
            return value == parseFloat(valueActive);
        }
        return value == valueActive;
    }

    /**
     * Kiểm tra quyền truy cập device
     */
    private async checkDevicePermission(deviceId: string, accountId: string): Promise<void> {
        const device = await this.prisma.devices.findFirst({
            where: { device_id: deviceId, is_deleted: false }
        });

        if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found");

        if (device!.account_id !== accountId) {
            throwError(ErrorCodes.FORBIDDEN, "No permission to access this device");
        }
    }

    /**
     * Map Prisma device link to DeviceLink interface
     */
    private mapPrismaDeviceLinkToDeviceLink(link: any): DeviceLink {
        return {
            id: link.id,
            input_device_id: link.input_device_id,
            output_device_id: link.output_device_id,
            component_id: link.component_id,
            value_active: link.value_active,
            logic_operator: link.logic_operator,
            output_action: link.output_action || 'turn_on',
            output_value: link.output_value || '', // Thêm output_value
            created_at: link.created_at,
            updated_at: link.updated_at,
            deleted_at: link.deleted_at,
            input_device: link.input_device,
            output_device: link.output_device,
            component: link.component
        };
    }

    /**
     * Thực hiện trigger output device (ví dụ: gửi lệnh, cập nhật trạng thái, emit socket...)
     */
    private async triggerOutputDevice(link: any): Promise<void> {
        try {
            const outputDevice = link.output_device;
            console.log('------- Link', link)
            if (!io || !outputDevice?.serial_number) return;
    
            /* 1️⃣  Chuyển output_value (string | JSON | array) → mảng string */
            let values: (string | { action?: string, value?: string })[] = [];
            try {
                if (Array.isArray(link.output_value)) {
                    values = link.output_value;                         // đã là mảng
                } else if (typeof link.output_value === 'string') {
                    const parsed = JSON.parse(link.output_value);       // thử parse JSON
                    values = Array.isArray(parsed) ? parsed : [parsed];
                }
            } catch {
                values = [link.output_value];                           // fallback: 1 phần tử
            }
            
            console.log('values:', values)
            /* 2️⃣  Gửi lần lượt từng sự kiện trong mảng */
            for (const item of values) {
                // Mặc định action = output_action; có thể ghi đè bởi item
                let action: string = link.output_action || 'turn_on';
                let value: string | null = null;
                
                // Hỗ trợ cú pháp “action:value” (VD "brightness:100")
                if (typeof item === 'string') {
                    if (item.includes(':')) {
                        [action, value] = item.split(':');
                    } else {
                        action = item;
                    }
                } else if (typeof item === 'object' && item !== null && 'action' in item) {
                    // Cho phép truyền object { action, value }
                    action = (item as any).action || action;
                    value = (item as any).value || null;
                    console.log('item:', item);
                }
    
                
                io.emit('device_command', {
                    device_serial: outputDevice.serial_number,
                    action,
                    value,
                    link_id: link.id,
                    timestamp: new Date().toISOString()
                });
                console.log(`✅ [TriggerOutput] Đã emit ${action} → ${outputDevice.serial_number}`);
            }
    
        } catch (error) {
            console.error('❌ [TriggerOutput] Error triggering output device:', error);
        }
    }
}

export default DeviceLinksService; 