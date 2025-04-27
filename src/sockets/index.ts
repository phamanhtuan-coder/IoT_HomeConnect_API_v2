// src/sockets/index.ts
import { Server } from 'socket.io';
import { setupDeviceSocket } from './device.socket';

export const initSocket = (io: Server) => {
    setupDeviceSocket(io);
};