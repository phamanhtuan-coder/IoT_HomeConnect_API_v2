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
}

export interface DeviceLinkUpdate {
    value_active?: string;
    logic_operator?: 'AND' | 'OR';
    component_id?: string;
    output_action?: 'turn_on' | 'turn_off';
}

export interface DeviceLink {
    id: number;
    input_device_id: string;
    output_device_id: string;
    component_id: string;
    value_active: string;
    logic_operator: 'AND' | 'OR';
    output_action: 'turn_on' | 'turn_off';
    created_at: Date | null;
    updated_at: Date | null;
    deleted_at: Date | null;
    input_device?: any;
    output_device?: any;
    component?: any;
}

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
     * Xử lý logic trigger khi device value thay đổi
     */
    async processDeviceLinks(deviceId: string, currentValue: any): Promise<void> {
        try {
            // Lấy tất cả links có input_device_id là deviceId
            const inputLinks = await this.prisma.device_links.findMany({
                where: {
                    input_device_id: deviceId,
                    deleted_at: null
                },
                include: {
                    input_device: true,
                    output_device: true
                }
            });

            if (inputLinks.length === 0) return;

            // Group links by output device để xử lý logic AND/OR
            const linksByOutput = new Map<string, any[]>();
            for (const link of inputLinks) {
                const outputId = link.output_device_id;
                if (!linksByOutput.has(outputId)) {
                    linksByOutput.set(outputId, []);
                }
                linksByOutput.get(outputId)!.push(link);
            }

            // Xử lý từng output device
            for (const [outputDeviceId, links] of linksByOutput) {
                await this.processOutputDeviceLinks(outputDeviceId, links, deviceId, currentValue);
            }
        } catch (error) {
            console.error('Error processing device links:', error);
        }
    }

    /**
     * Xử lý links cho một output device cụ thể
     */
    private async processOutputDeviceLinks(
        outputDeviceId: string, 
        links: any[], 
        triggeredDeviceId: string, 
        currentValue: any
    ): Promise<void> {
        // Lấy tất cả input devices cho output này
        const allInputLinks = await this.prisma.device_links.findMany({
            where: {
                output_device_id: outputDeviceId,
                deleted_at: null
            },
            include: {
                input_device: {
                    select: {
                        device_id: true,
                        current_value: true
                    }
                }
            }
        });

        // Kiểm tra điều kiện cho từng input
        const conditionResults = new Map<string, boolean>();
        
        for (const link of allInputLinks) {
            const inputDeviceId = link.input_device_id;
            let valueToCheck = link.input_device?.current_value;
            
            // Nếu là device vừa update, dùng currentValue mới
            if (inputDeviceId === triggeredDeviceId) {
                valueToCheck = currentValue;
            }
            
            const conditionMet = this.checkValueCondition(valueToCheck, link.value_active);
            conditionResults.set(inputDeviceId, conditionMet);
        }

        // Áp dụng logic operator
        const shouldTrigger = this.evaluateLogicConditions(allInputLinks, conditionResults);
        
        if (shouldTrigger) {
            // Trigger output device
            const outputLink = links[0]; // Lấy link đầu tiên để có thông tin output device
            await this.triggerOutputDevice(outputLink);
        }
    }

    /**
     * Đánh giá logic conditions với AND/OR operators
     */
    private evaluateLogicConditions(links: any[], conditionResults: Map<string, boolean>): boolean {
        if (links.length === 0) return false;
        
        // Group by logic operator
        const andLinks: string[] = [];
        const orLinks: string[] = [];
        
        for (const link of links) {
            if (link.logic_operator === 'OR') {
                orLinks.push(link.input_device_id);
            } else {
                andLinks.push(link.input_device_id);
            }
        }
        
        // Evaluate AND conditions (tất cả phải true)
        let andResult = true;
        if (andLinks.length > 0) {
            andResult = andLinks.every(inputId => conditionResults.get(inputId) === true);
        }
        
        // Evaluate OR conditions (ít nhất 1 phải true)
        let orResult = false;
        if (orLinks.length > 0) {
            orResult = orLinks.some(inputId => conditionResults.get(inputId) === true);
        }
        
        // Final result: (AND conditions) && (OR conditions || no OR conditions)
        return andResult && (orResult || orLinks.length === 0);
    }

    /**
     * Kiểm tra điều kiện value có match với value_active không
     */
    private checkValueCondition(currentValue: any, valueActive: string): boolean {
        if (!currentValue || !Array.isArray(currentValue)) return false;

        // Tìm trong current_value có instance nào có value match với valueActive
        for (const component of currentValue) {
            if (component.instances && Array.isArray(component.instances)) {
                for (const instance of component.instances) {
                    if (this.compareValues(instance.value, valueActive, component.datatype)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * So sánh values dựa trên datatype
     */
    private compareValues(instanceValue: any, activeValue: string, datatype: string): boolean {
        if (datatype === 'NUMBER') {
            const numInstance = parseFloat(instanceValue);
            const numActive = parseFloat(activeValue);
            
            // Support comparison operators: >, <, >=, <=, ==
            if (activeValue.startsWith('>=')) {
                return numInstance >= parseFloat(activeValue.slice(2));
            } else if (activeValue.startsWith('<=')) {
                return numInstance <= parseFloat(activeValue.slice(2));
            } else if (activeValue.startsWith('>')) {
                return numInstance > parseFloat(activeValue.slice(1));
            } else if (activeValue.startsWith('<')) {
                return numInstance < parseFloat(activeValue.slice(1));
            } else {
                return numInstance === numActive;
            }
        } else if (datatype === 'BOOLEAN') {
            return String(instanceValue).toLowerCase() === activeValue.toLowerCase();
        } else {
            // STRING comparison
            return String(instanceValue) === activeValue;
        }
    }

    /**
     * Trigger output device
     */
    private async triggerOutputDevice(link: any): Promise<void> {
        try {
            const outputDevice = link.output_device;
            const powerStatus = link.output_action === 'turn_on' ? true : false;
            
            // Cập nhật trạng thái thiết bị output theo output_action
            await this.prisma.devices.update({
                where: { device_id: outputDevice.device_id },
                data: {
                    power_status: powerStatus,
                    updated_at: new Date()
                }
            });

            // Gửi command qua socket
            if (io) {
                io.of("/device")
                    .to(`device:${outputDevice.serial_number}`)
                    .emit("command", {
                        action: "updateState",
                        serialNumber: outputDevice.serial_number,
                        state: { power_status: powerStatus },
                        triggeredBy: link.input_device.serial_number,
                        linkId: link.id,
                        outputAction: link.output_action,
                        timestamp: new Date().toISOString()
                    });
            }

            const action = link.output_action === 'turn_on' ? 'bật' : 'tắt';
            console.log(`Device link triggered: ${link.input_device.name} -> ${action} ${outputDevice.name}`);
        } catch (error) {
            console.error('Error triggering output device:', error);
        }
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
            created_at: link.created_at,
            updated_at: link.updated_at,
            deleted_at: link.deleted_at,
            input_device: link.input_device,
            output_device: link.output_device,
            component: link.component
        };
    }
}

export default DeviceLinksService; 