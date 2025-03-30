import express, { Application } from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import errorMiddleware from './middleware/error.middleware';
import loggerMiddleware from './middleware/logger.middleware';
import routes from './routes';
import {appConfig} from "./config/app"; // Import the aggregated routes

export const initApp = (): { app: Application; io: Server } => {
    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: appConfig.corsOrigins,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
    });

    app.use(express.json());
    app.use(loggerMiddleware);
    app.use('/api', routes); // Mount all routes under /api
    app.use(errorMiddleware);

    return { app, io };
};