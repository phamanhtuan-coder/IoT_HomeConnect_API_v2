import { Server } from "socket.io";
import { ErrorCodes, throwError } from "../utils/errors";
import DeviceService from "./device.service";
import prisma from "../config/database";

let io: Server | null = null;

export function setGardenSocketInstance(socket: Server) {
    io = socket;
}

interface RelayDevice {
    serial_number: string;
    device_name: string;
    relay_pin: number;
    touch_pin: number;
    is_on: boolean;
    can_toggle: boolean;
    active_high: boolean;
    local_control: boolean;
    fire_override: boolean;
    last_toggle: number;
    status: string;
    description?: string;
}

interface RelayCommandResult {
    relay_serial: string;
    success: boolean;
    new_state?: string;
    device_name?: string;
    error?: string;
}

interface RelayStatusResult {
    relay_serial: string;
    device_name: string;
    relay_pin: number;
    touch_pin: number;
    current_state: string;
    can_toggle?: boolean;
    active_high?: boolean;
    local_control?: boolean;
    fire_override?: boolean;
    last_updated?: string;
    error?: string;
}

// ✅ Socket Hub and Garden Hub serials
const SOCKET_HUB_SERIAL = "SERL29JUN2501JYXECBR32V8BD77RW82";
const MEGA_GARDEN_SERIAL = "MEGA27JUN2501GARDEN_HUB_001";

// ✅ FIXED GARDEN ACCOUNT ID - No ownership/role checks needed
const GARDEN_SYSTEM_ACCOUNT = "ACCT12JUN2501JXH05RTHKX3MVCTK9GX";

// ✅ FIXED: Updated to match Arduino Mega Hub exactly (10 relays with mixed triggers)
const GARDEN_HUB_RELAYS: RelayDevice[] = [
    {
        serial_number: "RELAY27JUN2501FAN001CONTROL001",
        device_name: "Fan",
        relay_pin: 30,
        touch_pin: 25,
        is_on: false,
        can_toggle: true,
        active_high: false,
        local_control: true,
        fire_override: false,
        last_toggle: 0,
        status: "off"
    },
    {
        serial_number: "RELAY27JUN2501BUZZER1CONTROL01",
        device_name: "Buzzer",
        relay_pin: 31,
        touch_pin: 26,
        is_on: false,
        can_toggle: true,
        active_high: false,
        local_control: true,
        fire_override: true,
        last_toggle: 0,
        status: "off"
    },
    {
        serial_number: "RELAY27JUN2501LED001CONTROL001",
        device_name: "LED1",
        relay_pin: 32,
        touch_pin: 27,
        is_on: false,
        can_toggle: true,
        active_high: false,
        local_control: true,
        fire_override: false,
        last_toggle: 0,
        status: "off"
    },
    {
        serial_number: "RELAY27JUN2501LED002CONTROL001",
        device_name: "LED2",
        relay_pin: 33,
        touch_pin: 28,
        is_on: false,
        can_toggle: true,
        active_high: false,
        local_control: true,
        fire_override: false,
        last_toggle: 0,
        status: "off"
    },
    {
        serial_number: "RELAY27JUN2501LED003CONTROL001",
        device_name: "LED3",
        relay_pin: 34,
        touch_pin: 29,
        is_on: false,
        can_toggle: true,
        active_high: false,
        local_control: true,
        fire_override: false,
        last_toggle: 0,
        status: "off"
    },
    {
        serial_number: "RELAY27JUN2501LED004CONTROL001",
        device_name: "LED4",
        relay_pin: 35,
        touch_pin: 44,
        is_on: false,
        can_toggle: true,
        active_high: false,
        local_control: true,
        fire_override: false,
        last_toggle: 0,
        status: "off"
    },
    {
        serial_number: "RELAY27JUN2501LED220V7CONTROL1",
        device_name: "LED220V1",
        relay_pin: 36,
        touch_pin: 45,
        is_on: false,
        can_toggle: true,
        active_high: false,
        local_control: true,
        fire_override: false,
        last_toggle: 0,
        status: "off"
    },
    {
        serial_number: "RELAY27JUN2501LED220V8CONTROL1",
        device_name: "LED220V2",
        relay_pin: 37,
        touch_pin: 46,
        is_on: false,
        can_toggle: true,
        active_high: false,
        local_control: true,
        fire_override: false,
        last_toggle: 0,
        status: "off"
    },
    {
        serial_number: "RELAY27JUN2501PUMP9CONTROL001",
        device_name: "Pump",
        relay_pin: 23,
        touch_pin: 47,
        is_on: false,
        can_toggle: true,
        active_high: true,
        local_control: true,
        fire_override: false,
        last_toggle: 0,
        status: "off"
    },
    {
        serial_number: "RELAY27JUN2501RESERVE10CTRL01",
        device_name: "Reserve",
        relay_pin: 38,
        touch_pin: 48,
        is_on: false,
        can_toggle: true,
        active_high: false,
        local_control: false,
        fire_override: false,
        last_toggle: 0,
        status: "off"
    }
];

class GardenHubService {
    private deviceService: DeviceService;

    constructor() {
        this.deviceService = new DeviceService();
    }

    /**
     * ✅ SIMPLIFIED: Garden hub access - uses fixed account, no group/ownership checks
     */
    private async checkGardenHubAccess(accountId?: string): Promise<void> {
        // Garden system uses fixed account for simplified access
        // No need to check ownership, groups, or roles
        console.log(`[GARDEN-HUB] Garden system access - using fixed account: ${GARDEN_SYSTEM_ACCOUNT}`);
        console.log(`[GARDEN-HUB] Request from account: ${accountId || 'anonymous'}`);

        // Always allow access to garden system
        return;
    }

    /**
     * ✅ FIXED: Toggle relay via Socket Hub - uses fixed account
     */
    async toggleGardenRelay(
        relay_serial: string,
        power_status: boolean,
        accountId?: string
    ): Promise<any> {
        try {
            const relay = GARDEN_HUB_RELAYS.find(r => r.serial_number === relay_serial);
            if (!relay) {
                throwError(ErrorCodes.NOT_FOUND, `Relay device ${relay_serial} not found`);
                return;
            }

            await this.checkGardenHubAccess(accountId);

            // Send command via Socket Hub to Arduino Mega
            if (io) {
                const command = `CMD:${relay_serial}:${power_status ? 'ON' : 'OFF'}`;

                console.log(`[GARDEN-HUB] Sending relay command via Socket Hub: ${command}`);

                io.to(`device:${SOCKET_HUB_SERIAL}`).emit("command", {
                    action: "relay_command",
                    command: command,
                    target: "mega_relay",
                    relay_serial: relay_serial,
                    relay_action: power_status ? 'ON' : 'OFF',
                    trigger_type: relay.active_high ? 'HIGH' : 'LOW',
                    from_client: GARDEN_SYSTEM_ACCOUNT,
                    request_account: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            // Update local relay state
            relay.is_on = power_status;
            relay.status = power_status ? "on" : "off";
            relay.last_toggle = Date.now();

            return {
                success: true,
                relay_serial,
                device_name: relay.device_name,
                new_state: power_status ? 'ON' : 'OFF',
                trigger_type: relay.active_high ? 'HIGH' : 'LOW',
                routed_via: "socket_hub",
                garden_account: GARDEN_SYSTEM_ACCOUNT,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Toggle relay error for ${relay_serial}:`, error);
            throw error;
        }
    }

    /**
     * ✅ FIXED: Bulk relay operations via Socket Hub - uses fixed account
     */
    async bulkRelayControl(
        relay_commands: Array<{
            relay_serial: string;
            action: 'ON' | 'OFF' | 'TOGGLE';
        }>,
        accountId?: string
    ): Promise<any> {
        try {
            await this.checkGardenHubAccess(accountId);

            const results: RelayCommandResult[] = [];

            for (const cmd of relay_commands) {
                const relay = GARDEN_HUB_RELAYS.find(r => r.serial_number === cmd.relay_serial);
                if (!relay) {
                    results.push({
                        relay_serial: cmd.relay_serial,
                        success: false,
                        error: 'Relay not found'
                    });
                    continue;
                }

                try {
                    let targetState: boolean;

                    if (cmd.action === 'TOGGLE') {
                        targetState = !relay.is_on;
                    } else {
                        targetState = cmd.action === 'ON';
                    }

                    const result = await this.toggleGardenRelay(cmd.relay_serial, targetState, accountId);
                    results.push({
                        relay_serial: cmd.relay_serial,
                        success: true,
                        new_state: result.new_state,
                        device_name: relay.device_name
                    });

                } catch (error) {
                    results.push({
                        relay_serial: cmd.relay_serial,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            return {
                success: true,
                bulk_operation: true,
                total_commands: relay_commands.length,
                successful_commands: results.filter(r => r.success).length,
                failed_commands: results.filter(r => !r.success).length,
                routed_via: "socket_hub",
                garden_account: GARDEN_SYSTEM_ACCOUNT,
                results,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Bulk relay control error:`, error);
            throw error;
        }
    }

    /**
     * ✅ FIXED: Garden pump control via Socket Hub - uses fixed account
     */
    async controlGardenPump(
        action: 'START' | 'STOP',
        reason: string,
        accountId?: string
    ): Promise<any> {
        try {
            await this.checkGardenHubAccess(accountId);

            if (io) {
                const command = `CMD:GARDEN:PUMP_${action}`;

                console.log(`[GARDEN-HUB] Sending pump command via Socket Hub: ${command}`);

                io.to(`device:${SOCKET_HUB_SERIAL}`).emit("command", {
                    action: "garden_command",
                    command: command,
                    target: "mega_garden",
                    pump_action: action,
                    reason: reason,
                    from_client: GARDEN_SYSTEM_ACCOUNT,
                    request_account: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            // Update pump relay state (Relay 9 - index 8)
            const pumpRelay = GARDEN_HUB_RELAYS[8]; // PUMP9CONTROL001
            if (pumpRelay) {
                pumpRelay.is_on = action === 'START';
                pumpRelay.status = action === 'START' ? 'on' : 'off';
                pumpRelay.last_toggle = Date.now();
            }

            return {
                success: true,
                action: `PUMP_${action}`,
                reason,
                pump_relay: pumpRelay?.serial_number,
                routed_via: "socket_hub",
                garden_serial: MEGA_GARDEN_SERIAL,
                garden_account: GARDEN_SYSTEM_ACCOUNT,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Pump control error:`, error);
            throw error;
        }
    }

    /**
     * ✅ FIXED: RGB LED control via Socket Hub - uses fixed account
     */
    async controlGardenRGB(
        action: 'TEST' | 'AUTO' | 'MANUAL',
        color?: { red: number; green: number; blue: number },
        accountId?: string
    ): Promise<any> {
        try {
            await this.checkGardenHubAccess(accountId);

            if (io) {
                let command: string;

                if (action === 'MANUAL' && color) {
                    command = `CMD:GARDEN:RGB_MANUAL:${color.red},${color.green},${color.blue}`;
                } else {
                    command = `CMD:GARDEN:RGB_${action}`;
                }

                console.log(`[GARDEN-HUB] Sending RGB command via Socket Hub: ${command}`);

                io.to(`device:${SOCKET_HUB_SERIAL}`).emit("command", {
                    action: "garden_command",
                    command: command,
                    target: "mega_garden",
                    rgb_action: action,
                    color: color,
                    from_client: GARDEN_SYSTEM_ACCOUNT,
                    request_account: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            return {
                success: true,
                action: `RGB_${action}`,
                color,
                routed_via: "socket_hub",
                garden_serial: MEGA_GARDEN_SERIAL,
                garden_account: GARDEN_SYSTEM_ACCOUNT,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] RGB control error:`, error);
            throw error;
        }
    }

    /**
     * ✅ FIXED: Emergency alarm via Socket Hub - uses fixed account
     */
    async emergencyAlarmControl(
        action: 'ACTIVATE' | 'DEACTIVATE' | 'RESET_OVERRIDE',
        accountId?: string
    ): Promise<any> {
        try {
            await this.checkGardenHubAccess(accountId);

            const alarmRelay = GARDEN_HUB_RELAYS.find(r => r.device_name === 'Buzzer');
            if (!alarmRelay) {
                throwError(ErrorCodes.NOT_FOUND, 'Alarm buzzer relay not found');
                return;
            }

            if (io) {
                let command: string;

                if (action === 'RESET_OVERRIDE') {
                    command = `CMD:${alarmRelay.serial_number}:RESET_OVERRIDE`;
                } else {
                    command = `CMD:${alarmRelay.serial_number}:${action === 'ACTIVATE' ? 'ON' : 'OFF'}`;
                }

                console.log(`[GARDEN-HUB] Sending emergency alarm command via Socket Hub: ${command}`);

                io.to(`device:${SOCKET_HUB_SERIAL}`).emit("command", {
                    action: "emergency_alarm",
                    command: command,
                    target: "mega_alarm",
                    alarm_action: action,
                    relay_serial: alarmRelay.serial_number,
                    from_client: GARDEN_SYSTEM_ACCOUNT,
                    request_account: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            // Update alarm relay state
            if (action !== 'RESET_OVERRIDE') {
                alarmRelay.is_on = action === 'ACTIVATE';
                alarmRelay.status = action === 'ACTIVATE' ? 'on' : 'off';
                alarmRelay.last_toggle = Date.now();
            }

            return {
                success: true,
                action: `ALARM_${action}`,
                relay_serial: alarmRelay.serial_number,
                routed_via: "socket_hub",
                garden_serial: MEGA_GARDEN_SERIAL,
                garden_account: GARDEN_SYSTEM_ACCOUNT,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Emergency alarm control error:`, error);
            throw error;
        }
    }

    /**
     * ✅ Get all garden relay status - uses fixed account
     */
    async getGardenRelayStatus(accountId?: string): Promise<any> {
        try {
            await this.checkGardenHubAccess(accountId);

            const relayStatus: RelayStatusResult[] = GARDEN_HUB_RELAYS.map(relay => ({
                relay_serial: relay.serial_number,
                device_name: relay.device_name,
                relay_pin: relay.relay_pin,
                touch_pin: relay.touch_pin,
                current_state: relay.is_on ? 'ON' : 'OFF',
                can_toggle: relay.can_toggle,
                active_high: relay.active_high,
                local_control: relay.local_control,
                fire_override: relay.fire_override,
                last_updated: new Date(relay.last_toggle || Date.now()).toISOString()
            }));

            return {
                success: true,
                socket_hub_serial: SOCKET_HUB_SERIAL,
                garden_serial: MEGA_GARDEN_SERIAL,
                garden_account: GARDEN_SYSTEM_ACCOUNT,
                total_relays: GARDEN_HUB_RELAYS.length,
                mixed_triggers: true,
                touch_sensors: GARDEN_HUB_RELAYS.filter(r => r.local_control).length,
                relays: relayStatus,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Get relay status error:`, error);
            throw error;
        }
    }

    /**
     * ✅ FIXED: Automation control via Socket Hub - uses fixed account
     */
    async controlAutomation(
        automation_type: 'WATERING' | 'LIGHTING' | 'FAN',
        enabled: boolean,
        accountId?: string
    ): Promise<any> {
        try {
            await this.checkGardenHubAccess(accountId);

            if (io) {
                const command = `CMD:GARDEN:AUTO_${automation_type}_TOGGLE`;

                console.log(`[GARDEN-HUB] Sending automation command via Socket Hub: ${command}`);

                io.to(`device:${SOCKET_HUB_SERIAL}`).emit("command", {
                    action: "garden_automation",
                    command: command,
                    target: "mega_garden",
                    automation_type: automation_type,
                    enabled: enabled,
                    from_client: GARDEN_SYSTEM_ACCOUNT,
                    request_account: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            return {
                success: true,
                automation_type,
                enabled,
                routed_via: "socket_hub",
                garden_serial: MEGA_GARDEN_SERIAL,
                garden_account: GARDEN_SYSTEM_ACCOUNT,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Automation control error:`, error);
            throw error;
        }
    }

    /**
     * ✅ FIXED: Set thresholds via Socket Hub - uses fixed account
     */
    async setThreshold(
        threshold_type: 'SOIL' | 'LIGHT',
        value: number,
        accountId?: string
    ): Promise<any> {
        try {
            await this.checkGardenHubAccess(accountId);

            if (io) {
                const command = `CMD:GARDEN:SET_${threshold_type}_THRESHOLD:${value}`;

                console.log(`[GARDEN-HUB] Sending threshold command via Socket Hub: ${command}`);

                io.to(`device:${SOCKET_HUB_SERIAL}`).emit("command", {
                    action: "garden_threshold",
                    command: command,
                    target: "mega_garden",
                    threshold_type: threshold_type,
                    value: value,
                    from_client: GARDEN_SYSTEM_ACCOUNT,
                    request_account: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            return {
                success: true,
                threshold_type,
                value,
                unit: '%',
                routed_via: "socket_hub",
                garden_serial: MEGA_GARDEN_SERIAL,
                garden_account: GARDEN_SYSTEM_ACCOUNT,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Set threshold error:`, error);
            throw error;
        }
    }

    /**
     * ✅ Get available relays info
     */
    getAvailableRelays(): RelayDevice[] {
        return GARDEN_HUB_RELAYS.map(relay => ({
            ...relay,
            description: this.getRelayDescription(relay.device_name)
        }));
    }

    /**
     * ✅ Get relay descriptions in Vietnamese
     */
    private getRelayDescription(deviceName: string): string {
        const descriptions: Record<string, string> = {
            'Fan': 'Quạt thông gió cho hệ thống vườn',
            'Buzzer': 'Còi báo động/cảnh báo khẩn cấp',
            'LED1': 'Đèn LED chiếu sáng khu vực 1',
            'LED2': 'Đèn LED chiếu sáng khu vực 2',
            'LED3': 'Đèn LED chiếu sáng khu vực 3',
            'LED4': 'Đèn LED chiếu sáng khu vực 4',
            'LED220V1': 'Đèn 220V công suất cao khu vực 1',
            'LED220V2': 'Đèn 220V công suất cao khu vực 2',
            'Pump': 'Máy bơm tưới nước tự động',
            'Reserve': 'Thiết bị dự phòng'
        };
        return descriptions[deviceName] || 'Thiết bị không xác định';
    }

    /**
     * ✅ Handle relay status updates from Arduino Mega (via Socket Hub)
     */
    async handleRelayStatusUpdate(relaySerial: string, newState: boolean, timestamp?: string): Promise<void> {
        const relay = GARDEN_HUB_RELAYS.find(r => r.serial_number === relaySerial);
        if (relay) {
            relay.is_on = newState;
            relay.status = newState ? 'on' : 'off';
            relay.last_toggle = timestamp ? new Date(timestamp).getTime() : Date.now();

            console.log(`[GARDEN-HUB] Updated relay ${relay.device_name} to ${newState ? 'ON' : 'OFF'}`);
        }
    }

    /**
     * ✅ Get relay by serial number
     */
    getRelayBySerial(relaySerial: string): RelayDevice | undefined {
        return GARDEN_HUB_RELAYS.find(r => r.serial_number === relaySerial);
    }

    /**
     * ✅ Get all relay serials
     */
    getAllRelaySerials(): string[] {
        return GARDEN_HUB_RELAYS.map(r => r.serial_number);
    }
}

export default GardenHubService;