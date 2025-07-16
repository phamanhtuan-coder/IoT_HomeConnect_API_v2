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
     * Xử lý logic trigger khi device value thay đổi
     */
    async processDeviceLinks(deviceId: string, currentValue: any): Promise<void> {
        try {
            console.log('🔍 [DeviceLinks] Processing device links for device:', deviceId);
            console.log('📊 [DeviceLinks] Current value received:', JSON.stringify(currentValue, null, 2));
            
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

            console.log(`🔗 [DeviceLinks] Found ${inputLinks.length} input links for device ${deviceId}`);
            
            if (inputLinks.length === 0) {
                console.log('⚠️  [DeviceLinks] No input links found, exiting');
                return;
            }

            // Log chi tiết từng link
            inputLinks.forEach((link, index) => {
                console.log(`🔗 [DeviceLinks] Link ${index + 1}:`, {
                    id: link.id,
                    component_id: link.component_id,
                    value_active: link.value_active,
                    logic_operator: link.logic_operator,
                    output_action: link.output_action,
                    output_value: link.output_value,
                    output_device_name: link.output_device?.name
                });
            });

            // Group links by output device để xử lý logic AND/OR
            const linksByOutput = new Map<string, any[]>();
            for (const link of inputLinks) {
                const outputId = link.output_device_id;
                if (!linksByOutput.has(outputId)) {
                    linksByOutput.set(outputId, []);
                }
                linksByOutput.get(outputId)!.push(link);
            }

            console.log(`🎯 [DeviceLinks] Processing ${linksByOutput.size} output devices`);

            // Xử lý từng output device
            for (const [outputDeviceId, links] of linksByOutput) {
                console.log(`⚙️ [DeviceLinks] Processing output device: ${outputDeviceId}`);
                await this.processOutputDeviceLinks(outputDeviceId, links, deviceId, currentValue);
            }
        } catch (error) {
            console.error('❌ [DeviceLinks] Error processing device links:', error);
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
        console.log(`🔍 [ProcessOutput] Processing links for output device: ${outputDeviceId}`);
        console.log(`🔍 [ProcessOutput] Triggered by device: ${triggeredDeviceId}`);
        
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

        console.log(`🔗 [ProcessOutput] Found ${allInputLinks.length} total input links for this output`);

        // Kiểm tra điều kiện cho từng input
        const conditionResults = new Map<string, boolean>();
        
        for (const link of allInputLinks) {
            const inputDeviceId = link.input_device_id;
            let valueToCheck = link.input_device?.current_value;
            
            // Nếu là device vừa update, dùng currentValue mới
            if (inputDeviceId === triggeredDeviceId) {
                valueToCheck = currentValue;
                console.log(`🔄 [ProcessOutput] Using NEW value for triggered device ${inputDeviceId}`);
            } else {
                console.log(`📊 [ProcessOutput] Using stored value for device ${inputDeviceId}`);
            }
            
            console.log(`🔍 [ProcessOutput] Checking condition for link:`, {
                input_device_id: inputDeviceId,
                component_id: link.component_id,
                value_active: link.value_active,
                valueToCheck: JSON.stringify(valueToCheck, null, 2)
            });
            
            const conditionMet = this.checkValueCondition(valueToCheck, link.value_active);
            conditionResults.set(inputDeviceId, conditionMet);
            
            console.log(`✅ [ProcessOutput] Condition result for ${inputDeviceId}: ${conditionMet}`);
        }

        // Áp dụng logic operator
        console.log('🔍 [ProcessOutput] Evaluating logic conditions...');
        const shouldTrigger = this.evaluateLogicConditions(allInputLinks, conditionResults);
        
        console.log(`🎯 [ProcessOutput] Should trigger output device: ${shouldTrigger}`);
        
        if (shouldTrigger) {
            // Trigger output device
            const outputLink = links[0]; // Lấy link đầu tiên để có thông tin output device
            console.log(`🚀 [ProcessOutput] TRIGGERING output device: ${outputLink.output_device?.name}`);
            await this.triggerOutputDevice(outputLink);
        } else {
            console.log(`⏸️ [ProcessOutput] Conditions not met, NOT triggering output device`);
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
        console.log(`🔍 [CheckCondition] Checking value condition:`);
        console.log(`📊 [CheckCondition] Current value:`, JSON.stringify(currentValue, null, 2));
        console.log(`🎯 [CheckCondition] Target value active: "${valueActive}"`);
        
        if (!currentValue || !Array.isArray(currentValue)) {
            console.log(`❌ [CheckCondition] Invalid current value - not an array`);
            return false;
        }

        // Tìm trong current_value có instance nào có value match với valueActive
        for (let i = 0; i < currentValue.length; i++) {
            const component = currentValue[i];
            console.log(`🔍 [CheckCondition] Checking component ${i}:`, {
                component_id: component.component_id,
                name: component.name,
                datatype: component.datatype,
                instances_count: component.instances?.length || 0
            });
            
            if (component.instances && Array.isArray(component.instances)) {
                for (let j = 0; j < component.instances.length; j++) {
                    const instance = component.instances[j];
                    console.log(`🔍 [CheckCondition] Checking instance ${j}:`, {
                        instance_id: instance.instance_id,
                        value: instance.value,
                        datatype: component.datatype
                    });
                    
                    const comparisonResult = this.compareValues(instance.value, valueActive, component.datatype);
                    console.log(`⚖️ [CheckCondition] Comparison result: ${comparisonResult}`);
                    
                    if (comparisonResult) {
                        console.log(`✅ [CheckCondition] MATCH FOUND! Condition met.`);
                        return true;
                    }
                }
            } else {
                console.log(`⚠️ [CheckCondition] Component has no instances array`);
            }
        }

        console.log(`❌ [CheckCondition] NO MATCH FOUND. Condition not met.`);
        return false;
    }

    /**
     * So sánh values dựa trên datatype
     */
    private compareValues(instanceValue: any, activeValue: string, datatype: string): boolean {
        console.log(`🔍 [CompareValues] Comparing values:`);
        console.log(`   - Instance value: ${instanceValue} (type: ${typeof instanceValue})`);
        console.log(`   - Active value: "${activeValue}" (type: ${typeof activeValue})`);
        console.log(`   - Data type: ${datatype}`);
        
        if (datatype === 'NUMBER') {
            const numInstance = parseFloat(instanceValue);
            const numActive = parseFloat(activeValue);
            
            console.log(`🔢 [CompareValues] NUMBER comparison:`);
            console.log(`   - Parsed instance: ${numInstance}`);
            console.log(`   - Parsed active: ${numActive}`);
            
            // Support comparison operators: >, <, >=, <=, ==
            if (activeValue.startsWith('>=')) {
                const threshold = parseFloat(activeValue.slice(2));
                const result = numInstance >= threshold;
                console.log(`   - Operator: >= ${threshold}, Result: ${result}`);
                return result;
            } else if (activeValue.startsWith('<=')) {
                const threshold = parseFloat(activeValue.slice(2));
                const result = numInstance <= threshold;
                console.log(`   - Operator: <= ${threshold}, Result: ${result}`);
                return result;
            } else if (activeValue.startsWith('>')) {
                const threshold = parseFloat(activeValue.slice(1));
                const result = numInstance > threshold;
                console.log(`   - Operator: > ${threshold}, Result: ${result}`);
                return result;
            } else if (activeValue.startsWith('<')) {
                const threshold = parseFloat(activeValue.slice(1));
                const result = numInstance < threshold;
                console.log(`   - Operator: < ${threshold}, Result: ${result}`);
                return result;
            } else {
                const result = numInstance === numActive;
                console.log(`   - Operator: === ${numActive}, Result: ${result}`);
                return result;
            }
        } else if (datatype === 'BOOLEAN') {
            const result = String(instanceValue).toLowerCase() === activeValue.toLowerCase();
            console.log(`🔘 [CompareValues] BOOLEAN comparison: ${result}`);
            return result;
        } else {
            // STRING comparison
            const result = String(instanceValue) === activeValue;
            console.log(`📝 [CompareValues] STRING comparison: ${result}`);
            return result;
        }
    }

    /**
     * Trigger output device
     */
    private async triggerOutputDevice(link: any): Promise<void> {
        try {
            console.log(`🚀 [TriggerOutput] Starting trigger for output device`);
            console.log(`🔗 [TriggerOutput] Link details:`, {
                id: link.id,
                output_action: link.output_action,
                output_value: link.output_value,
                output_device_name: link.output_device?.name,
                output_device_id: link.output_device?.device_id
            });
            
            const outputDevice = link.output_device;
            const powerStatus = link.output_action === 'turn_on' ? true : false;
            
            console.log(`⚡ [TriggerOutput] Setting power status to: ${powerStatus}`);
            
            // Prepare update data với output_value nếu có
            const updateData: any = {
                power_status: powerStatus,
                updated_at: new Date()
            };
            
            // Nếu có output_value, cập nhật current_value của device
            if (link.output_value && link.output_value.trim() !== '') {
                console.log(`💡 [TriggerOutput] Processing output_value: ${link.output_value}`);
                
                // Tạo current_value structure cho output device
                const outputValue = this.buildOutputValue(link.output_value, link.output_action);
                console.log(`🏗️ [TriggerOutput] Built output value:`, JSON.stringify(outputValue, null, 2));
                
                if (outputValue) {
                    updateData.current_value = outputValue;
                    console.log(`✅ [TriggerOutput] Added current_value to update data`);
                } else {
                    console.log(`⚠️ [TriggerOutput] Failed to build output value`);
                }
            } else {
                console.log(`📝 [TriggerOutput] No output_value specified, only updating power status`);
            }
            
            console.log(`💾 [TriggerOutput] Final update data:`, JSON.stringify(updateData, null, 2));
            
            // Cập nhật trạng thái thiết bị output
            const updatedDevice = await this.prisma.devices.update({
                where: { device_id: outputDevice.device_id },
                data: updateData
            });
            
            console.log(`✅ [TriggerOutput] Device updated successfully in database`);

            // Gửi command qua socket với output_value
            if (io) {
                const socketData: any = {
                    action: "updateState",
                    serialNumber: outputDevice.serial_number,
                    state: { power_status: powerStatus },
                    triggeredBy: link.input_device.serial_number,
                    linkId: link.id,
                    outputAction: link.output_action,
                    timestamp: new Date().toISOString()
                };
                
                // Thêm output_value vào socket data nếu có
                if (link.output_value && link.output_value.trim() !== '') {
                    socketData.outputValue = link.output_value;
                    socketData.state.outputValue = link.output_value;
                    console.log(`📡 [TriggerOutput] Added output_value to socket data`);
                }
                
                console.log(`📡 [TriggerOutput] Sending socket command:`, JSON.stringify(socketData, null, 2));
                
                io.of("/device")
                    .to(`device:${outputDevice.serial_number}`)
                    .emit("command", socketData);
                    
                console.log(`✅ [TriggerOutput] Socket command sent to device:${outputDevice.serial_number}`);
            } else {
                console.log(`⚠️ [TriggerOutput] Socket.IO not available, skipping socket command`);
            }

            const action = link.output_action === 'turn_on' ? 'bật' : 'tắt';
            const valueText = link.output_value ? ` với giá trị ${link.output_value}` : '';
            const successMessage = `Device link triggered: ${link.input_device.name} -> ${action} ${outputDevice.name}${valueText}`;
            
            console.log(`🎉 [TriggerOutput] SUCCESS: ${successMessage}`);
        } catch (error) {
            console.error('❌ [TriggerOutput] Error triggering output device:', error);
        }
    }

    /**
     * Build output value structure based on predefined values
     */
    private buildOutputValue(outputValue: string, outputAction: string): any[] | null {
        try {
            // Tạo cấu trúc current_value cho output device
            const timestamp = new Date().toISOString();
            
            // Thử parse JSON array từ frontend
            try {
                const outputArray = JSON.parse(outputValue);
                if (Array.isArray(outputArray) && outputArray.length > 0) {
                    const components: any[] = [];
                    
                    for (const item of outputArray) {
                        if (item === 'alert') {
                            // Thêm component cảnh báo
                            components.push({
                                component_id: 'alert_mode',
                                name: 'Chế độ cảnh báo',
                                datatype: 'BOOLEAN',
                                unit: '',
                                instances: [{
                                    instance_id: 'alert_01',
                                    value: true,
                                    timestamp: timestamp
                                }]
                            });
                        } else if (item === 'brightness_control') {
                            // Thêm component độ sáng mặc định
                            components.push({
                                component_id: 'brightness_control',
                                name: 'Điều khiển độ sáng',
                                datatype: 'NUMBER',
                                unit: 'lux',
                                instances: [{
                                    instance_id: 'brightness_01',
                                    value: 100, // Giá trị mặc định
                                    timestamp: timestamp
                                }]
                            });
                        } else if (item.startsWith('brightness:')) {
                            // Thêm component độ sáng với giá trị cụ thể
                            const value = item.split(':')[1];
                            components.push({
                                component_id: 'brightness_control',
                                name: 'Điều khiển độ sáng',
                                datatype: 'NUMBER',
                                unit: 'lux',
                                instances: [{
                                    instance_id: 'brightness_01',
                                    value: parseInt(value) || 100,
                                    timestamp: timestamp
                                }]
                            });
                        }
                    }
                    
                    if (components.length > 0) {
                        return components;
                    }
                }
            } catch (jsonError) {
                // Không phải JSON array, xử lý như string thường
                console.log('Output value không phải JSON array, xử lý như string:', outputValue);
            }
            
            // Xử lý brightness values cũ (fallback)
            if (['25', '50', '75', '100'].includes(outputValue)) {
                return [{
                    component_id: 'brightness_control',
                    name: 'Điều khiển độ sáng',
                    datatype: 'NUMBER',
                    unit: '%',
                    instances: [{
                        instance_id: 'brightness_01',
                        value: parseInt(outputValue),
                        timestamp: timestamp
                    }]
                }];
            }
            
            // Xử lý alert mode values cũ (fallback)
            if (['low_alert', 'medium_alert', 'high_alert', 'emergency_alert'].includes(outputValue)) {
                return [{
                    component_id: 'alert_mode',
                    name: 'Chế độ cảnh báo',
                    datatype: 'STRING',
                    unit: '',
                    instances: [{
                        instance_id: 'alert_01',
                        value: outputValue,
                        timestamp: timestamp
                    }]
                }];
            }
            
            // Default: trả về power status
            return [{
                component_id: 'power_control',
                name: 'Điều khiển nguồn',
                datatype: 'BOOLEAN',
                unit: '',
                instances: [{
                    instance_id: 'power_01',
                    value: outputAction === 'turn_on',
                    timestamp: timestamp
                }]
            }];
        } catch (error) {
            console.error('Error building output value:', error);
            return null;
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
            output_value: link.output_value || '', // Thêm output_value
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