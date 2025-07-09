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
            const accountId = req.user?.accountId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Authentication required');
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
            const accountId = req.user?.accountId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Authentication required');
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
            const accountId = req.user?.accountId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Authentication required');
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
            const accountId = req.user?.accountId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Authentication required');
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
            const accountId = req.user?.accountId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Authentication required');

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
            const accountId = req.user?.accountId;

            if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Authentication required');
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
}

export default GardenHubController;