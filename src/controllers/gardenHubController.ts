import { Request, Response, NextFunction } from 'express';
import GardenHubService from '../services/gardenHubService';
import { ErrorCodes, throwError } from '../utils/errors';

class GardenHubController {
    private gardenHubService: GardenHubService;

    constructor() {
        this.gardenHubService = new GardenHubService();
    }

    /**
     * Toggle single relay
     */
    toggleRelay = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { relay_serial } = req.params;
            const { power_status } = req.body;
            const accountId = req.user?.userId || req.user?.employeeId;
            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

            if (power_status === undefined) throwError(ErrorCodes.BAD_REQUEST, 'power_status is required');

            const result = await this.gardenHubService.toggleGardenRelay(
                relay_serial,
                power_status,
                accountId
            );

            res.status(200).json({
                success: true,
                message: 'Relay toggled successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Bulk relay control
     */
    bulkRelayControl = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { relay_commands } = req.body;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            if (!Array.isArray(relay_commands) || relay_commands.length === 0) {
                throwError(ErrorCodes.BAD_REQUEST, 'relay_commands array is required');
            }

            const result = await this.gardenHubService.bulkRelayControl(relay_commands, accountId);

            res.status(200).json({
                success: true,
                message: 'Bulk relay control completed',
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Control garden pump
     */
    controlPump = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { action, reason } = req.body;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            if (!['START', 'STOP'].includes(action)) {
                throwError(ErrorCodes.BAD_REQUEST, 'action must be START or STOP');
            }

            const result = await this.gardenHubService.controlGardenPump(
                action,
                reason || 'Manual control',
                accountId
            );

            res.status(200).json({
                success: true,
                message: `Pump ${action.toLowerCase()}ed successfully`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Control RGB LED
     */
    controlRGB = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { action, color } = req.body;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            if (!['TEST', 'AUTO', 'MANUAL'].includes(action)) {
                throwError(ErrorCodes.BAD_REQUEST, 'action must be TEST, AUTO, or MANUAL');
            }

            if (action === 'MANUAL' && !color) {
                throwError(ErrorCodes.BAD_REQUEST, 'color is required for MANUAL action');
            }

            const result = await this.gardenHubService.controlGardenRGB(action, color, accountId);

            res.status(200).json({
                success: true,
                message: `RGB ${action.toLowerCase()} completed`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get relay status
     */
    getRelayStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

            const result = await this.gardenHubService.getGardenRelayStatus(accountId);

            res.status(200).json({
                success: true,
                message: 'Relay status retrieved successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Emergency alarm control
     */
    emergencyAlarm = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { action } = req.body;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            if (!['ACTIVATE', 'DEACTIVATE', 'RESET_OVERRIDE'].includes(action)) {
                throwError(ErrorCodes.BAD_REQUEST, 'action must be ACTIVATE, DEACTIVATE, or RESET_OVERRIDE');
            }

            const result = await this.gardenHubService.emergencyAlarmControl(action, accountId);

            res.status(200).json({
                success: true,
                message: `Emergency alarm ${action.toLowerCase()}d successfully`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get available relays
     */
    getAvailableRelays = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const relays = this.gardenHubService.getAvailableRelays();

            res.status(200).json({
                success: true,
                message: 'Available relays retrieved successfully',
                data: {
                    total_relays: relays.length,
                    relays
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Control automation systems
     */
    controlAutomation = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { automation_type, enabled } = req.body;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            if (!['WATERING', 'LIGHTING', 'FAN'].includes(automation_type)) {
                throwError(ErrorCodes.BAD_REQUEST, 'automation_type must be WATERING, LIGHTING, or FAN');
            }
            if (typeof enabled !== 'boolean') {
                throwError(ErrorCodes.BAD_REQUEST, 'enabled must be a boolean value');
            }

            const result = await this.gardenHubService.controlAutomation(
                automation_type,
                enabled,
                accountId
            );

            res.status(200).json({
                success: true,
                message: `Automation ${automation_type.toLowerCase()} ${enabled ? 'enabled' : 'disabled'} successfully`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Set sensor thresholds
     */
    setThreshold = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { threshold_type, value } = req.body;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            if (!['SOIL', 'LIGHT'].includes(threshold_type)) {
                throwError(ErrorCodes.BAD_REQUEST, 'threshold_type must be SOIL or LIGHT');
            }
            if (typeof value !== 'number' || value < 0 || value > 100) {
                throwError(ErrorCodes.BAD_REQUEST, 'value must be a number between 0 and 100');
            }

            const result = await this.gardenHubService.setThreshold(
                threshold_type,
                value,
                accountId
            );

            res.status(200).json({
                success: true,
                message: `${threshold_type.toLowerCase()} threshold set to ${value}% successfully`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get garden hub system status
     */
    getSystemStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');

            // Get relay status
            const relayStatus = await this.gardenHubService.getGardenRelayStatus(accountId);

            // Get available relays info
            const availableRelays = this.gardenHubService.getAvailableRelays();

            // Calculate system statistics
            const totalRelays = availableRelays.length;
            const activeRelays = relayStatus.relays?.filter((r: any) => r.current_state === 'ON').length || 0;
            const errorRelays = relayStatus.relays?.filter((r: any) => r.error).length || 0;

            res.status(200).json({
                success: true,
                message: 'Garden hub system status retrieved successfully',
                data: {
                    system_info: {
                        socket_hub_serial: relayStatus.socket_hub_serial,
                        garden_serial: relayStatus.garden_serial,
                        timestamp: new Date().toISOString()
                    },
                    relay_statistics: {
                        total_relays: totalRelays,
                        active_relays: activeRelays,
                        inactive_relays: totalRelays - activeRelays - errorRelays,
                        error_relays: errorRelays
                    },
                    relay_status: relayStatus.relays || [],
                    available_relays: availableRelays
                }
            });
        } catch (error) {
            next(error);
        }
    };
}

export default GardenHubController;

