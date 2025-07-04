import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { Server as HttpServer } from 'http';
import { setupDeviceSocket } from '../sockets/device.socket';
import { setupHubSocket } from '../sockets/hub.socket';
import { CameraSocket } from '../sockets/camera.socket';
import { setSocketInstance } from '../services/camera.service';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const initializeSocket = (server: HttpServer): Server => {
    const io = new Server(server, {
        cors: {
            origin: '*', // Adjust for production
            methods: ['GET', 'POST'],
        },
        path: '/socket.io',
    });

    // Initialize Redis clients
    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();

    // Set up Redis adapter
    io.adapter(createAdapter(pubClient, subClient));

    // Initialize socket handlers
    setupDeviceSocket(io);
    setupHubSocket(io);

    // Initialize camera socket and pass socket instance to service
    new CameraSocket(io);
    setSocketInstance(io);

    console.log('🔌 WebSocket server initialized with Redis adapter');
    console.log('📷 Camera socket namespace initialized');

    return io;
};