// src/app.ts
import express, {Application} from 'express';
import {Server} from 'socket.io';
import {createServer} from 'http';
import {createAdapter} from '@socket.io/redis-adapter';
import {Redis} from 'ioredis';
import errorMiddleware from './middleware/error.middleware';
import loggerMiddleware from './middleware/logger.middleware';
import routes from './routes';
import {appConfig} from './config/app';
import {setupSwagger} from "./config/swagger";

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const initApp = (): { app: Application; io: Server } => {
    const app = express();
    const httpServer = createServer(app);
    setupSwagger(app);

    // Initialize Redis clients
    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();

    const io = new Server(httpServer, {
        cors: {
            origin: appConfig.corsOrigins,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
        path: '/socket.io',
        adapter: createAdapter(pubClient, subClient),
    });

    app.use(express.json());
    app.use(loggerMiddleware);
    app.use('/api', routes);
    app.use(errorMiddleware);

    return {app, io};
};