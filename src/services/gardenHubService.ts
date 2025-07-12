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

// Relay devices từ Arduino Mega Hub
const GARDEN_HUB_RELAYS: RelayDevice[] = [
    { serial_number: "RELAY27JUN2501FAN001CONTROL001", device_name: "Fan", relay_pin: 30, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501ALARM01CONTROL01", device_name: "Alarm", relay_pin: 31, is_on: false, can_toggle: true, fire_override: true, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501RESERVED003CTRL1", device_name: "Reserved3", relay_pin: 32, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501RESERVED004CTRL1", device_name: "Reserved4", relay_pin: 33, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501RESERVED005CTRL1", device_name: "Reserved5", relay_pin: 34, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501RESERVED006CTRL1", device_name: "Reserved6", relay_pin: 35, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501LIGHT007CONTROL1", device_name: "Light1", relay_pin: 36, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" },
    { serial_number: "RELAY27JUN2501LIGHT008CONTROL1", device_name: "Light2", relay_pin: 37, is_on: false, can_toggle: true, fire_override: false, last_toggle: 0, status: "off" }
];

const MEGA_HUB_SERIAL = "MEGA_HUB_GARDEN_001";

class GardenHubService {
    private deviceService: DeviceService;

    constructor() {
        this.deviceService = new DeviceService();
    }

    /**
     * Toggle relay state (reuse existing device toggle logic)
     */
    async toggleGardenRelay(
        relay_serial: string,
        power_status: boolean,
        accountId: string
    ): Promise<any> {
        try {
            // Validate relay exists
            const relay = GARDEN_HUB_RELAYS.find(r => r.serial_number === relay_serial);
            if (!relay) {
                throwError(ErrorCodes.NOT_FOUND, `Relay device ${relay_serial} not found`);
                return; // This will never be reached, but helps TypeScript
            }

            // Use existing device service for permission check and state update
            await this.deviceService.checkDevicePermission(relay_serial, accountId, true);

            // Send command to Arduino Mega Hub via Socket
            if (io) {
                const relayCommand = {
                    action: 'relay_command',
                    hubSerial: MEGA_HUB_SERIAL,
                    relaySerial: relay_serial,
                    relayAction: power_status ? 'ON' : 'OFF',
                    relayName: relay.device_name,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                };

                console.log(`[GARDEN-HUB] Sending relay command to Mega Hub:`, relayCommand);

                // Send to Mega Hub device namespace
                io.of("/device").to(`device:${MEGA_HUB_SERIAL}`).emit("command", relayCommand);

                // Also send to hub namespace if exists
                io.of("/hub").to(`hub:${MEGA_HUB_SERIAL}`).emit("relay_command", relayCommand);
            }

            // Update state using device service pattern
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
                timestamp: new Date().toISOString(),
                device: updatedDevice
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Toggle relay error for ${relay_serial}:`, error);
            throw error;
        }
    }

    /**
     * Bulk relay operations
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
                        // Get current state from device
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
                results,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Bulk relay control error:`, error);
            throw error;
        }
    }

    /**
     * Special garden operations
     */
    async controlGardenPump(
        action: 'START' | 'STOP',
        reason: string,
        accountId: string
    ): Promise<any> {
        try {
            await this.deviceService.checkDevicePermission(MEGA_HUB_SERIAL, accountId, true);

            if (io) {
                const pumpCommand = {
                    action: 'garden_pump',
                    hubSerial: MEGA_HUB_SERIAL,
                    pumpAction: action,
                    reason,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                };

                console.log(`[GARDEN-HUB] Sending pump command to Mega Hub:`, pumpCommand);

                io.of("/device").to(`device:${MEGA_HUB_SERIAL}`).emit("command", pumpCommand);
            }

            return {
                success: true,
                action: `PUMP_${action}`,
                reason,
                hub_serial: MEGA_HUB_SERIAL,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Pump control error:`, error);
            throw error;
        }
    }

    /**
     * RGB LED control for garden status
     */
    async controlGardenRGB(
        action: 'TEST' | 'AUTO' | 'MANUAL',
        color?: { red: number; green: number; blue: number },
        accountId?: string
    ): Promise<any> {
        try {
            if (accountId) {
                await this.deviceService.checkDevicePermission(MEGA_HUB_SERIAL, accountId, true);
            }

            if (io) {
                const rgbCommand = {
                    action: 'garden_rgb',
                    hubSerial: MEGA_HUB_SERIAL,
                    rgbAction: action,
                    color,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                };

                console.log(`[GARDEN-HUB] Sending RGB command to Mega Hub:`, rgbCommand);

                io.of("/device").to(`device:${MEGA_HUB_SERIAL}`).emit("command", rgbCommand);
            }

            return {
                success: true,
                action: `RGB_${action}`,
                color,
                hub_serial: MEGA_HUB_SERIAL,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] RGB control error:`, error);
            throw error;
        }
    }

    /**
     * Get all garden relay status
     */
    async getGardenRelayStatus(accountId: string): Promise<any> {
        try {
            await this.deviceService.checkDevicePermission(MEGA_HUB_SERIAL, accountId, false);

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
                hub_serial: MEGA_HUB_SERIAL,
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
     * Emergency fire alarm control
     */
    async emergencyAlarmControl(
        action: 'ACTIVATE' | 'DEACTIVATE' | 'RESET_OVERRIDE',
        accountId: string
    ): Promise<any> {
        try {
            await this.deviceService.checkDevicePermission(MEGA_HUB_SERIAL, accountId, true);

            const alarmRelay = GARDEN_HUB_RELAYS.find(r => r.device_name === 'Alarm');
            if (!alarmRelay) {
                throwError(ErrorCodes.NOT_FOUND, 'Alarm relay not found');
                return; // This will never be reached, but helps TypeScript
            }

            if (io) {
                const alarmCommand = {
                    action: 'emergency_alarm',
                    hubSerial: MEGA_HUB_SERIAL,
                    alarmAction: action,
                    relaySerial: alarmRelay.serial_number,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                };

                console.log(`[GARDEN-HUB] Sending emergency alarm command:`, alarmCommand);

                io.of("/device").to(`device:${MEGA_HUB_SERIAL}`).emit("command", alarmCommand);
            }

            return {
                success: true,
                action: `ALARM_${action}`,
                relay_serial: alarmRelay.serial_number,
                hub_serial: MEGA_HUB_SERIAL,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`[GARDEN-HUB] Emergency alarm control error:`, error);
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
            'Reserved3': 'Relay dự phòng 3',
            'Reserved4': 'Relay dự phòng 4',
            'Reserved5': 'Relay dự phòng 5',
            'Reserved6': 'Relay dự phòng 6'
        };
        return descriptions[deviceName] || 'Thiết bị không xác định';
    }
}

export default GardenHubService;