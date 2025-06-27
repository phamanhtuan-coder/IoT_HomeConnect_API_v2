// src/sockets/index.ts
import { Server } from 'socket.io';
import { setupDeviceSocket } from './device.socket';
import {setupDoorSocket} from "./door.socket";

export const initSocket = (io: Server) => {
    setupDeviceSocket(io);
    setupDoorSocket(io);
};