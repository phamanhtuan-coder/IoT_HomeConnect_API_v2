import { Server } from 'socket.io';

export class OutputEventService {
    private static io: Server | null = null;

    static setSocketInstance(io: Server) {
        this.io = io;
    }

    /**
     * Xử lý output_value: đổi preset LED, chỉnh độ sáng, chuyển chế độ cảnh báo, ...
     * @param serialNumber Serial thiết bị nhận lệnh
     * @param action Hành động (ví dụ: 'color', 'brightness', 'applyPreset', ...)
     * @param value Giá trị (ví dụ: 'red', 100, 'party_mode', ...)
     * @param extraData Dữ liệu bổ sung (nếu có)
     */
    static async handleOutputValue({ serialNumber, action, value, extraData }: {
        serialNumber: string,
        action: string,
        value?: any,
        extraData?: any
    }) {
        if (!this.io) {
            console.error('[OutputEventService] Socket.IO instance not set!');
            return;
        }
        if (!serialNumber || !action) {
            console.error('[OutputEventService] Missing serialNumber or action!');
            return;
        }

        // Chỉ emit các event đã có trong socket
        switch (action) {
            case 'alert_led':
                // Chế độ đèn cảnh báo: fireworks
                this.io.to(`device:${serialNumber}`).emit('command', {
                    action: 'setEffect',
                    effect: 'fireworks',
                    ...extraData,
                    timestamp: new Date().toISOString()
                });
                console.log(`[OutputEventService] Đã gửi lệnh alert_led (fireworks) qua 'command' cho thiết bị ${serialNumber}`);
                break;
            case 'color':
            case 'brightness':
            case 'setEffect':
            case 'applyPreset':
            case 'updateState':
                // Gửi lệnh LED qua event 'command'
                this.io.to(`device:${serialNumber}`).emit('command', {
                    action,
                    value,
                    ...extraData,
                    timestamp: new Date().toISOString()
                });
                console.log(`[OutputEventService] Đã gửi lệnh ${action} (${value}) qua 'command' cho thiết bị ${serialNumber}`);
                break;
            case 'reset_alarm':
                this.io.to(`device:${serialNumber}`).emit('reset_alarm', {
                    ...extraData,
                    timestamp: new Date().toISOString()
                });
                console.log(`[OutputEventService] Đã gửi 'reset_alarm' cho thiết bị ${serialNumber}`);
                break;
            case 'test_alarm':
                this.io.to(`device:${serialNumber}`).emit('test_alarm', {
                    ...extraData,
                    timestamp: new Date().toISOString()
                });
                console.log(`[OutputEventService] Đã gửi 'test_alarm' cho thiết bị ${serialNumber}`);
                break;
            case 'update_config':
                this.io.to(`device:${serialNumber}`).emit('update_config', {
                    config: value,
                    ...extraData,
                    timestamp: new Date().toISOString()
                });
                console.log(`[OutputEventService] Đã gửi 'update_config' cho thiết bị ${serialNumber}`);
                break;
            case 'alarmAlert':
                this.io.to(`device:${serialNumber}`).emit('alarmAlert', {
                    ...extraData,
                    timestamp: new Date().toISOString()
                });
                console.log(`[OutputEventService] Đã gửi 'alarmAlert' cho thiết bị ${serialNumber}`);
                break;
            case 'led_preset_applied':
                this.io.to(`device:${serialNumber}`).emit('led_preset_applied', {
                    preset: value,
                    ...extraData,
                    timestamp: new Date().toISOString()
                });
                console.log(`[OutputEventService] Đã gửi 'led_preset_applied' cho thiết bị ${serialNumber}`);
                break;
            case 'led_state_updated':
                this.io.to(`device:${serialNumber}`).emit('led_state_updated', {
                    state: value,
                    ...extraData,
                    timestamp: new Date().toISOString()
                });
                console.log(`[OutputEventService] Đã gửi 'led_state_updated' cho thiết bị ${serialNumber}`);
                break;
            case 'led_effect_set':
                this.io.to(`device:${serialNumber}`).emit('led_effect_set', {
                    effect: value,
                    ...extraData,
                    timestamp: new Date().toISOString()
                });
                console.log(`[OutputEventService] Đã gửi 'led_effect_set' cho thiết bị ${serialNumber}`);
                break;
            default:
                // fallback: gửi qua 'command' nếu là lệnh chung
                this.io.to(`device:${serialNumber}`).emit('command', {
                    action,
                    value,
                    ...extraData,
                    timestamp: new Date().toISOString()
                });
                console.log(`[OutputEventService] Đã gửi lệnh ${action} (${value}) qua 'command' cho thiết bị ${serialNumber}`);
        }
    }
} 