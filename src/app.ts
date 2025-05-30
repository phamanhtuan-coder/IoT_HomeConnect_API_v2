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
import {configureSwagger} from "./config/swagger";
import cors from 'cors';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const initApp = (): { app: Application; io: Server; httpServer: any } => {
    const app = express();
    const httpServer = createServer(app);

    // Cấu hình middleware cơ bản
    app.use(express.json());
    app.use(loggerMiddleware);

    // Khởi tạo Redis
    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();

    // Khởi tạo Socket.IO
    const io = new Server(httpServer, {
        cors: {
            origin: appConfig.corsOrigins,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
        path: '/socket.io',
        adapter: createAdapter(pubClient, subClient),
    });
    app.use(cors({
        origin: '*', // Cho phép tất cả origin (có thể giới hạn cụ thể nếu cần)
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        // allowedHeaders: ['Content-Type', 'Authorization'],
        allowedHeaders: '*',
    }));

    app.use(cors({
        origin: '*', // Cho phép tất cả origin (có thể giới hạn cụ thể nếu cần)
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        // allowedHeaders: ['Content-Type', 'Authorization'],
        allowedHeaders: '*',
    }));
    
    // Khởi tạo routes API
    app.use('/api', routes);


    // Cấu hình Swagger sau khi đã có routes
    configureSwagger(app);

    // Error handling middleware luôn phải ở cuối
    app.use(errorMiddleware);

    return {app, io, httpServer};
};

