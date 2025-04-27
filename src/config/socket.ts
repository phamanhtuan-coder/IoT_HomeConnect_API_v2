import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { Server as HttpServer } from 'http';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const initializeSocket = (server: HttpServer): Server => {
    const io = new Server(server, {
        cors: {
            origin: '*', // Adjust for production
            methods: ['GET', 'POST'],
        },
        path: '/device',
    });

    // Initialize Redis clients
    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();

    // Set up Redis adapter
    io.adapter(createAdapter(pubClient, subClient));

    return io;
};