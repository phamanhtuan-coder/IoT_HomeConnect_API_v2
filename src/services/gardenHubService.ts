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
    is_on: boolean;
    can_toggle: boolean;
    fire_override: boolean;
    last_toggle: number;
    status: string;
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
    current_state: string;
    can_toggle?: boolean;
    fire_override?: boolean;
    last_updated?: string;
    error?: string;
}

// ✅ FIXED: Use correct Socket Hub Serial
const SOCKET_HUB_SERIAL = "SERL29JUN2501JYXECBR32V8BD77RW82";
const MEGA_GARDEN_SERIAL = "MEGA27JUN2501GARDEN_HUB_001";

// Relay devices từ Arduino Mega Hub
const GARDEN_HUB_RELAYS: RelayDevice[] = [
    { serial_number: "RELAY27JUN2501FAN001CONTROL001", device_name: "Fan", relay_pin: 30, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501ALARM01CONTROL01", device_name: "Alarm", relay_pin: 31, is_on: false, can_toggle: true, fire_override: true, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501LIGHT001CONTROL1", device_name: "Light1", relay_pin: 32, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501LIGHT002CONTROL1", device_name: "Light2", relay_pin: 33, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501PUMP002CONTROL01", device_name: "Pump2", relay_pin: 34, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501HEATER1CONTROL01", device_name: "Heater", relay_pin: 35, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501COOLER1CONTROL01", device_name: "Cooler", relay_pin: 36, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501RESERVE8CONTROL1", device_name: "Reserve", relay_pin: 37, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" }
];

class GardenHubService {
    private deviceService: DeviceService;

    constructor() {
        this.deviceService = new DeviceService();
    }

    /**
     * ✅ FIXED: Toggle relay via Socket Hub
     */
    async toggleGardenRelay(
        relay_serial: string,
        power_status: boolean,
        accountId: string
    ): Promise<any> {
        try {
            const relay = GARDEN_HUB_RELAYS.find(r => r.serial_number === relay_serial);
            if (!relay) {
                throwError(ErrorCodes.NOT_FOUND, `Relay device ${relay_serial} not found`);
                return;
            }

            await this.deviceService.checkDevicePermission(relay_serial, accountId, true);

            // ✅ FIXED: Send via Socket Hub with simple command format
            if (io) {
                const command = `CMD:${relay_serial}:${power_status ? 'ON' : 'OFF'}`;

                console.log(`[GARDEN-HUB] Sending relay command via Socket Hub: ${command}`);

                // Send to Socket Hub - it will forward to Mega
                io.to(`device:${SOCKET_HUB_SERIAL}`).emit("command", {
                    action: "relay_command",
                    command: command,
                    target: "mega_relay",
                    relay_serial: relay_serial,
                    relay_action: power_status ? 'ON' : 'OFF',
                    from_client: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            const updatedDevice = await this.deviceService.updateDeviceState(
                relay_serial,
                { power_status },
                accountId
            );

            return {
                success: true,
                relay_serial,
                device_name: relay.device_name,
                new_state: power_status ? 'ON' : 'OFF',
                routed_via: "socket_hub",
                timestamp: new Date().toISOString(),
                device: updatedDevice
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Toggle relay error for ${relay_serial}:`, error);
            throw error;
        }
    }

    /**
     * ✅ FIXED: Bulk relay operations via Socket Hub
     */
    async bulkRelayControl(
        relay_commands: Array<{
            relay_serial: string;
            action: 'ON' | 'OFF' | 'TOGGLE';
        }>,
        accountId: string
    ): Promise<any> {
        try {
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
                        const currentState = await this.deviceService.getDeviceState(cmd.relay_serial, accountId);
                        targetState = !currentState.power_status;
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
                routed_via: "socket_hub",
                results,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Bulk relay control error:`, error);
            throw error;
        }
    }

    /**
     * ✅ FIXED: Garden pump control via Socket Hub
     */
    async controlGardenPump(
        action: 'START' | 'STOP',
        reason: string,
        accountId: string
    ): Promise<any> {
        try {
            await this.deviceService.checkDevicePermission(SOCKET_HUB_SERIAL, accountId, true);

            if (io) {
                const command = `GARDEN_CMD:PUMP_${action}`;

                console.log(`[GARDEN-HUB] Sending pump command via Socket Hub: ${command}`);

                // Send to Socket Hub - it will forward to Mega
                io.to(`device:${SOCKET_HUB_SERIAL}`).emit("command", {
                    action: "garden_command",
                    command: command,
                    target: "mega_garden",
                    pump_action: action,
                    reason: reason,
                    from_client: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            return {
                success: true,
                action: `PUMP_${action}`,
                reason,
                routed_via: "socket_hub",
                garden_serial: MEGA_GARDEN_SERIAL,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Pump control error:`, error);
            throw error;
        }
    }

    /**
     * ✅ FIXED: RGB LED control via Socket Hub
     */
    async controlGardenRGB(
        action: 'TEST' | 'AUTO' | 'MANUAL',
        color?: { red: number; green: number; blue: number },
        accountId?: string
    ): Promise<any> {
        try {
            if (accountId) {
                await this.deviceService.checkDevicePermission(SOCKET_HUB_SERIAL, accountId, true);
            }

            if (io) {
                const command = `GARDEN_CMD:RGB_${action}`;

                console.log(`[GARDEN-HUB] Sending RGB command via Socket Hub: ${command}`);

                // Send to Socket Hub - it will forward to Mega
                io.to(`device:${SOCKET_HUB_SERIAL}`).emit("command", {
                    action: "garden_command",
                    command: command,
                    target: "mega_garden",
                    rgb_action: action,
                    color: color,
                    from_client: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            return {
                success: true,
                action: `RGB_${action}`,
                color,
                routed_via: "socket_hub",
                garden_serial: MEGA_GARDEN_SERIAL,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] RGB control error:`, error);
            throw error;
        }
    }

    /**
     * ✅ FIXED: Emergency alarm via Socket Hub
     */
    async emergencyAlarmControl(
        action: 'ACTIVATE' | 'DEACTIVATE' | 'RESET_OVERRIDE',
        accountId: string
    ): Promise<any> {
        try {
            await this.deviceService.checkDevicePermission(SOCKET_HUB_SERIAL, accountId, true);

            const alarmRelay = GARDEN_HUB_RELAYS.find(r => r.device_name === 'Alarm');
            if (!alarmRelay) {
                throwError(ErrorCodes.NOT_FOUND, 'Alarm relay not found');
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

                // Send to Socket Hub - it will forward to Mega
                io.to(`device:${SOCKET_HUB_SERIAL}`).emit("command", {
                    action: "emergency_alarm",
                    command: command,
                    target: "mega_alarm",
                    alarm_action: action,
                    relay_serial: alarmRelay.serial_number,
                    from_client: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            return {
                success: true,
                action: `ALARM_${action}`,
                relay_serial: alarmRelay.serial_number,
                routed_via: "socket_hub",
                garden_serial: MEGA_GARDEN_SERIAL,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Emergency alarm control error:`, error);
            throw error;
        }
    }

    /**
     * Get all garden relay status
     */
    async getGardenRelayStatus(accountId: string): Promise<any> {
        try {
            await this.deviceService.checkDevicePermission(SOCKET_HUB_SERIAL, accountId, false);

            const relayStatus: RelayStatusResult[] = [];

            for (const relay of GARDEN_HUB_RELAYS) {
                try {
                    const deviceState = await this.deviceService.getDeviceState(relay.serial_number, accountId);
                    relayStatus.push({
                        relay_serial: relay.serial_number,
                        device_name: relay.device_name,
                        relay_pin: relay.relay_pin,
                        current_state: deviceState.power_status ? 'ON' : 'OFF',
                        can_toggle: relay.can_toggle,
                        fire_override: relay.fire_override,
                        last_updated: deviceState.timestamp || new Date().toISOString()
                    });
                } catch (error) {
                    relayStatus.push({
                        relay_serial: relay.serial_number,
                        device_name: relay.device_name,
                        relay_pin: relay.relay_pin,
                        current_state: 'UNKNOWN',
                        error: 'Failed to get state'
                    });
                }
            }

            return {
                success: true,
                socket_hub_serial: SOCKET_HUB_SERIAL,
                garden_serial: MEGA_GARDEN_SERIAL,
                total_relays: GARDEN_HUB_RELAYS.length,
                relays: relayStatus,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Get relay status error:`, error);
            throw error;
        }
    }

    /**
     * ✅ FIXED: Automation control via Socket Hub
     */
    async controlAutomation(
        automation_type: 'WATERING' | 'LIGHTING' | 'FAN',
        enabled: boolean,
        accountId: string
    ): Promise<any> {
        try {
            await this.deviceService.checkDevicePermission(SOCKET_HUB_SERIAL, accountId, true);

            if (io) {
                const command = `GARDEN_CMD:AUTO_${automation_type}_TOGGLE`;

                console.log(`[GARDEN-HUB] Sending automation command via Socket Hub: ${command}`);

                io.to(`device:${SOCKET_HUB_SERIAL}`).emit("command", {
                    action: "garden_automation",
                    command: command,
                    target: "mega_garden",
                    automation_type: automation_type,
                    enabled: enabled,
                    from_client: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            return {
                success: true,
                automation_type,
                enabled,
                routed_via: "socket_hub",
                garden_serial: MEGA_GARDEN_SERIAL,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Automation control error:`, error);
            throw error;
        }
    }

    /**
     * ✅ FIXED: Set thresholds via Socket Hub
     */
    async setThreshold(
        threshold_type: 'SOIL' | 'LIGHT',
        value: number,
        accountId: string
    ): Promise<any> {
        try {
            await this.deviceService.checkDevicePermission(SOCKET_HUB_SERIAL, accountId, true);

            if (io) {
                const command = `GARDEN_CMD:SET_${threshold_type}_THRESHOLD:${value}`;

                console.log(`[GARDEN-HUB] Sending threshold command via Socket Hub: ${command}`);

                io.to(`device:${SOCKET_HUB_SERIAL}`).emit("command", {
                    action: "garden_threshold",
                    command: command,
                    target: "mega_garden",
                    threshold_type: threshold_type,
                    value: value,
                    from_client: accountId,
                    timestamp: new Date().toISOString()
                });
            }

            return {
                success: true,
                threshold_type,
                value,
                routed_via: "socket_hub",
                garden_serial: MEGA_GARDEN_SERIAL,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Set threshold error:`, error);
            throw error;
        }
    }

    /**
     * Get available relays info
     */
    getAvailableRelays(): RelayDevice[] {
        return GARDEN_HUB_RELAYS.map(relay => ({
            ...relay,
            description: this.getRelayDescription(relay.device_name)
        })) as any;
    }

    private getRelayDescription(deviceName: string): string {
        const descriptions: Record<string, string> = {
            'Fan': 'Quạt thông gió cho hệ thống',
            'Alarm': 'Còi báo cháy khẩn cấp',
            'Light1': 'Đèn chiếu sáng khu vực 1',
            'Light2': 'Đèn chiếu sáng khu vực 2',
            'Pump2': 'Máy bơm dự phòng',
            'Heater': 'Máy sưởi',
            'Cooler': 'Máy làm mát',
            'Reserve': 'Thiết bị dự phòng'
        };
        return descriptions[deviceName] || 'Thiết bị không xác định';
    }
}

export default GardenHubService;