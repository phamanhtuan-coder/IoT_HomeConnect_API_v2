import {Socket} from "socket.io";
import CameraService from '../../services/camera.service';
const cameraService = new CameraService();

async function handleCameraStatus(socket: Socket, clientNamespace: any, data: any) {
    const { serialNumber } = socket.data;
    console.log(`📊 Handling camera_status for ${serialNumber}: ${JSON.stringify(data, null, 2)}`);

    const statusData = {
        serialNumber,
        status: data.status,
        streamActive: data.streamActive,
        resolution: data.resolution,
        fps: data.fps || 0,
        clients: data.clients,
        uptime: data.uptime,
        freeHeap: data.freeHeap,
        timestamp: new Date().toISOString()
    };

    try {
        await cameraService.updateCameraMetrics(serialNumber, statusData);
        clientNamespace.to(`camera:${serialNumber}`).emit('camera_status_update', statusData);
    } catch (err) {
        console.log(`❌ Error handling camera_status for ${serialNumber}: ${err}`);
    }
}

async function handlePhotoCaptured(socket: Socket, clientNamespace: any, data: any) {
    const { serialNumber } = socket.data;
    console.log(`📸 Handling photo_captured for ${serialNumber}: ${JSON.stringify(data, null, 2)}`);

    const photoData = {
        serialNumber,
        filename: data.filename,
        size: data.size,
        capturedAt: new Date(data.timestamp),
        savedToSD: data.savedToSD
    };

    try {
        await cameraService.savePhotoMetadata(photoData);
        clientNamespace.to(`camera:${serialNumber}`).emit('photo_captured', {
            serialNumber,
            filename: data.filename,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.log(`❌ Error handling photo_captured for ${serialNumber}: ${err}`);
    }
}

async function handleMotionDetected(socket: Socket, clientNamespace: any, data: any) {
    const { serialNumber } = socket.data;
    console.log(`🚨 Handling motion_detected for ${serialNumber}: ${JSON.stringify(data, null, 2)}`);

    try {
        await cameraService.createMotionAlert(serialNumber, data);
        clientNamespace.to(`camera:${serialNumber}`).emit('motion_alert', {
            serialNumber,
            intensity: data.intensity,
            region: data.region,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.log(`❌ Error handling motion_detected for ${serialNumber}: ${err}`);
    }
}

export { handleCameraStatus, handlePhotoCaptured, handleMotionDetected };