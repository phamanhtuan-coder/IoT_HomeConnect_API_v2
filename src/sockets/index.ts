// src/sockets/index.ts
import { Server } from 'socket.io';
import { setupDeviceSocket } from './device.socket';
import { setupCameraSocket } from './camera.socket';

export const initSocket = (io: Server) => {
    console.log('🔧 Initializing Socket.IO server...');
    console.log(`📋 Socket.IO config: ${JSON.stringify({
        pingInterval: io.engine.opts.pingInterval,
        pingTimeout: io.engine.opts.pingTimeout,
        maxHttpBufferSize: io.engine.opts.maxHttpBufferSize
    }, null, 2)}`);

    // Increase pingTimeout to 30s
    io.engine.opts.pingTimeout = 30000;

    // Log middleware
    io.use((socket, next) => {
        console.log(`🔍 Global middleware triggered for Socket ID: ${socket.id}`);
        console.log(`📝 Middleware details: ${JSON.stringify({
            headers: socket.handshake.headers,
            query: socket.handshake.query,
            address: socket.handshake.address,
            time: socket.handshake.time
        }, null, 2)}`);
        next();
    });

    setupDeviceSocket(io);
    setupCameraSocket(io);
    console.log('✅ Socket.IO namespaces initialized: /device, /camera, /client');
};