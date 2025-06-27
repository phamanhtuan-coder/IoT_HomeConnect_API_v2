import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { DoorSocketEvents, DoorCommandData, DoorSensorData, DoorStatusResponse } from '../types/door.types';
import {
    handleDoorStatus,
    handleDoorCommandResponse,
    handleDoorEmergency,
    handleDoorCalibration,
    handleDoorTest,
    handleDoorMaintenance,
    validateDoorAccess,
    handleDoorSensorData,
    handleDoorError
} from './handlers/door.handlers';

const prisma = new PrismaClient();

export const setupDoorSocket = (io: Server) => {
    const doorNamespace = io.of('/door');
    const clientNamespace = io.of('/client');

    doorNamespace.on('connection', async (socket: Socket) => {
        const { serialNumber } = socket.handshake.query as { serialNumber?: string };

        if (!serialNumber) {
            console.error('Door connection rejected: Missing serial number');
            socket.disconnect();
            return;
        }

        try {
            const device = await prisma.devices.findFirst({
                where: { serial_number: serialNumber, is_deleted: false }
            });

            if (!device) {
                console.error(`Door ${serialNumber} not found in database`);
                socket.disconnect();
                return;
            }

            socket.join(`door:${serialNumber}`);
            console.log(`Door ${serialNumber} connected to socket`);

            socket.on('door_sensor_data', (data: DoorSensorData) => {
                handleDoorSensorData(socket, clientNamespace, data, prisma);
            });

            socket.on('door_status', (data: DoorStatusResponse) => {
                handleDoorStatus(socket, clientNamespace, data, prisma);
            });

            socket.on('door_command_response', (data) => {
                handleDoorCommandResponse(socket, clientNamespace, {
                    serialNumber,
                    ...data
                });
            });

            socket.on('door_error', (data) => {
                handleDoorError(socket, clientNamespace, {
                    serialNumber,
                    ...data
                }, prisma);
            });

            socket.on('door_maintenance_alert', (data) => {
                handleDoorMaintenance(socket, clientNamespace, {
                    serialNumber,
                    ...data
                }, prisma);
            });

            socket.on('calibration_result', (data) => {
                handleDoorCalibration(socket, clientNamespace, {
                    serialNumber,
                    ...data
                });
            });

            socket.on('test_result', (data) => {
                handleDoorTest(socket, clientNamespace, {
                    serialNumber,
                    ...data
                });
            });

            socket.on('disconnect', () => {
                console.log(`Door ${serialNumber} disconnected`);
                clientNamespace.emit('door_disconnect', {
                    serialNumber,
                    timestamp: new Date().toISOString()
                });
            });

        } catch (error) {
            console.error(`Error in door socket setup:`, error);
            socket.disconnect();
        }
    });

    clientNamespace.on('connection', async (socket: Socket) => {
        const { serialNumber, accountId } = socket.handshake.query as {
            serialNumber?: string;
            accountId?: string;
        };

        if (!serialNumber || !accountId) {
            console.error('Client connection rejected: Missing parameters');
            socket.disconnect();
            return;
        }

        try {
            const hasAccess = await validateDoorAccess(serialNumber, accountId, prisma);
            if (!hasAccess) {
                console.error(`Access denied for user ${accountId} to door ${serialNumber}`);
                socket.disconnect();
                return;
            }

            socket.join(`door:${serialNumber}`);
            console.log(`Client connected to door ${serialNumber}`);

            socket.on('door_command', (command: DoorCommandData) => {
                doorNamespace.to(`door:${serialNumber}`).emit('door_command', {
                    ...command,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                });
            });

            socket.on('door_calibrate', (data) => {
                doorNamespace.to(`door:${serialNumber}`).emit('door_calibrate', {
                    serialNumber,
                    angles: data.angles,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                });
            });

            socket.on('door_test', (data) => {
                doorNamespace.to(`door:${serialNumber}`).emit('door_test', {
                    serialNumber,
                    test_type: data.test_type,
                    fromClient: accountId,
                    timestamp: new Date().toISOString()
                });
            });

            socket.on('start_monitoring', () => {
                socket.join(`door:${serialNumber}:monitor`);
            });

            socket.on('stop_monitoring', () => {
                socket.leave(`door:${serialNumber}:monitor`);
            });

            socket.on('disconnect', () => {
                console.log(`Client disconnected from door ${serialNumber}`);
            });

        } catch (error) {
            console.error(`Error in client socket setup:`, error);
            socket.disconnect();
        }
    });
};