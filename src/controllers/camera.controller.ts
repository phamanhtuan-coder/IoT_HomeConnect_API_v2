import { Request, Response, NextFunction } from 'express';
import {CameraService}from '../services/camera.service';
import { ErrorCodes, throwError } from '../utils/errors';
import axios from 'axios';

class CameraController {
    private cameraService: CameraService;

    constructor() {
        this.cameraService = new CameraService();
    }

    // Get MJPEG stream URL with auth token
    getStreamUrl = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serialNumber } = req.params;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            }

            // Generate stream token with access verification built-in
            const streamResponse = await this.cameraService.generateStreamToken(
                serialNumber,
                accountId
            );

            res.json(streamResponse);
        } catch (error) {
            next(error);
        }
    };

    // Capture photo command
    capturePhoto = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serialNumber } = req.params;
            const { saveToSD = true, quality = 10 } = req.body;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            }

            await this.cameraService.checkCameraAccess(serialNumber, accountId);

            // Send capture command to ESP32-CAM
            const commandResponse = await this.cameraService.sendCameraCommand(serialNumber, {
                action: 'capture',
                params: { saveToSD, quality }
            });

            if (!commandResponse.success) {
                throwError(ErrorCodes.INTERNAL_SERVER_ERROR, "Failed to capture photo");
            }

            // Handle the response properly based on the actual result structure
            const result = commandResponse.result || {};
            const filename = result.filename || `photo_${Date.now()}.jpg`;
            const size = result.size || 0;

            res.json({
                success: true,
                filename: filename,
                size: size,
                downloadUrl: `/api/camera/photos/${serialNumber}/${filename}`,
                timestamp: commandResponse.timestamp
            });
        } catch (error) {
            next(error);
        }
    };

    // Camera control (PTZ, settings, etc.)
    controlCamera = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serialNumber } = req.params;
            const { action, params } = req.body;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            }

            await this.cameraService.checkCameraAccess(serialNumber, accountId);

            const commandResponse = await this.cameraService.sendCameraCommand(serialNumber, {
                action,
                params
            });

            res.json(commandResponse);
        } catch (error) {
            next(error);
        }
    };

    // Get camera status - Updated to use existing getCameraInfo method
    getCameraStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serialNumber } = req.params;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            }

            await this.cameraService.checkCameraAccess(serialNumber, accountId);

            const cameraInfo = await this.cameraService.getCameraInfo(serialNumber);

            res.json({
                success: true,
                status: cameraInfo.status,
                ip_address: cameraInfo.ip_address,
                last_seen: cameraInfo.attribute?.last_seen
            });
        } catch (error) {
            next(error);
        }
    };

    // Update camera configuration - Simplified to use sendCameraCommand
    updateCameraConfig = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serialNumber } = req.params;
            const config = req.body;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            }

            await this.cameraService.checkCameraAccess(serialNumber, accountId);

            const result = await this.cameraService.sendCameraCommand(serialNumber, {
                action: 'updateConfig',
                params: config
            });

            res.json({
                success: result.success,
                message: result.success ? 'Configuration updated successfully' : 'Failed to update configuration',
                config: result.result
            });
        } catch (error) {
            next(error);
        }
    };

    // Get list of saved photos - Simplified to use sendCameraCommand
    getPhotosList = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serialNumber } = req.params;
            const { limit = 20, offset = 0 } = req.query;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            }

            await this.cameraService.checkCameraAccess(serialNumber, accountId);

            const photosResponse = await this.cameraService.sendCameraCommand(serialNumber, {
                action: 'getPhotosList',
                params: { limit: Number(limit), offset: Number(offset) }
            });

            res.json(photosResponse);
        } catch (error) {
            next(error);
        }
    };

    // Download specific photo
    downloadPhoto = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serialNumber, filename } = req.params;
            const { thumbnail } = req.query;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            }

            await this.cameraService.checkCameraAccess(serialNumber, accountId);

            try {
                // Get camera info first
                const camera = await this.cameraService.getCameraInfo(serialNumber);

                // Use ESP32 route structure with query parameters
                const photoUrl = thumbnail === 'true'
                    ? `http://${camera.ip_address}/thumbnail?filename=${filename}`
                    : `http://${camera.ip_address}/photo?filename=${filename}`;

                console.log(`[Camera] Fetching photo from: ${photoUrl}`);

                // Proxy the photo from ESP32-CAM
                const response = await axios.get(photoUrl, {
                    responseType: 'stream',
                    timeout: 15000,
                    headers: {
                        'Accept': 'image/jpeg'
                    }
                });

                // Set appropriate headers
                res.set({
                    'Content-Type': 'image/jpeg',
                    'Content-Disposition': thumbnail === 'true'
                        ? `inline; filename="thumb_${filename}"`
                        : `attachment; filename="${filename}"`,
                    'Cache-Control': 'public, max-age=86400'
                });

                // Pipe the image data
                response.data.pipe(res);

                // Handle errors
                response.data.on('error', (error: any) => {
                    console.error('Photo download error:', error);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Photo download failed' });
                    }
                });

            } catch (downloadError: any) {
                console.error('Error downloading photo:', downloadError);

                if (downloadError.code === 'ECONNREFUSED') {
                    throwError(ErrorCodes.SERVICE_UNAVAILABLE, 'Camera is offline or unreachable');
                } else if (downloadError.response?.status === 404) {
                    throwError(ErrorCodes.NOT_FOUND, 'Photo not found on camera');
                } else {
                    throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to download photo');
                }
            }
        } catch (error) {
            next(error);
        }
    };

    // Get camera capabilities
    getCameraCapabilities = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serialNumber } = req.params;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            }

            await this.cameraService.checkCameraAccess(serialNumber, accountId);

            const capabilities = await this.cameraService.getCameraCapabilities(serialNumber);

            res.json({
                success: true,
                capabilities
            });
        } catch (error) {
            next(error);
        }
    };

    // Get camera information
    getCameraInfo = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serialNumber } = req.params;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
            }

            await this.cameraService.checkCameraAccess(serialNumber, accountId);

            const cameraInfo = await this.cameraService.getCameraInfo(serialNumber);
            const capabilities = await this.cameraService.getCameraCapabilities(serialNumber);

            res.json({
                success: true,
                camera: {
                    serialNumber: cameraInfo.serialNumber,
                    status: cameraInfo.status,
                    ip_address: cameraInfo.ip_address,
                    public_url: cameraInfo.public_url,
                    last_seen: cameraInfo.attribute?.last_seen,
                    capabilities: capabilities.merged_capabilities,
                    account_id: cameraInfo.account_id
                }
            });
        } catch (error) {
            next(error);
        }
    };

    // Stream proxy for MJPEG streaming
    proxyStream = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { serialNumber } = req.params;
            const { token } = req.query;
            const accountId = req.user?.userId || req.user?.employeeId;

            if (!accountId) {
                throwError(ErrorCodes.UNAUTHORIZED, 'User not authenticated');
                return;
            }

            if (!token) {
                throwError(ErrorCodes.BAD_REQUEST, 'Stream token required');
                return;
            }

            // Verify token
            try {
                const tokenData = Buffer.from(token as string, 'base64').toString('utf-8');
                const [tokenSerial, tokenAccountId, timestamp] = tokenData.split(':');

                if (tokenSerial !== serialNumber || tokenAccountId !== accountId) {
                    throwError(ErrorCodes.FORBIDDEN, 'Invalid stream token');
                    return;
                }

                // Check if token is expired (1 hour)
                const tokenTime = parseInt(timestamp);
                if (Date.now() - tokenTime > 3600000) {
                    throwError(ErrorCodes.FORBIDDEN, 'Stream token expired');
                    return;
                }
            } catch (error) {
                throwError(ErrorCodes.FORBIDDEN, 'Invalid stream token format');
                return;
            }

            // Get camera info and proxy the stream
            const camera = await this.cameraService.getCameraInfo(serialNumber);
            const streamUrl = `http://${camera.ip_address}/stream`;

            try {
                const response = await axios.get(streamUrl, {
                    responseType: 'stream',
                    timeout: 30000,
                    headers: {
                        'Accept': 'multipart/x-mixed-replace; boundary=frame'
                    }
                });

                // Set appropriate headers for MJPEG stream
                res.set({
                    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'Access-Control-Allow-Origin': '*'
                });

                // Pipe the camera stream to the response
                response.data.pipe(res);

                // Handle stream errors
                response.data.on('error', (error: any) => {
                    console.error('Stream proxy error:', error);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Stream error' });
                    }
                });

                // Clean up on client disconnect
                req.on('close', () => {
                    response.data.destroy();
                });

            } catch (streamError) {
                console.error('Error connecting to camera stream:', streamError);
                throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to connect to camera stream');
            }
        } catch (error) {
            next(error);
        }
    };
}

export default CameraController;
