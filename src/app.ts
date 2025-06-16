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
import { initCronJobs } from './cron';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const initApp = (): { app: Application; io: Server; httpServer: any } => {
    const app = express();
    const httpServer = createServer(app);

    // Khởi tạo các cron jobs cho maintenance
    initCronJobs();

    // Cấu hình middleware cơ bản
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    app.use(loggerMiddleware);

    // Khởi tạo Redis
    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();

    // Khởi tạo Socket.IO với hỗ trợ ESP8266
    const io = new Server(httpServer, {
        // ============= ESP8266 COMPATIBILITY SETTINGS =============
        allowEIO3: true,                    // Essential for ESP8266 clients
        transports: ['polling', 'websocket'], // Support both transports for ESP8266

        // ============= TIMING OPTIMIZATION FOR ESP8266 =============
        pingInterval: 30000,                // 30 seconds (increased for ESP8266)
        pingTimeout: 25000,                 // 25 seconds (adjusted for ESP8266)
        maxHttpBufferSize: 100000,          // 100KB limit for ESP8266 memory constraints

        // ============= CORS CONFIGURATION =============
        cors: {
            origin: appConfig.corsOrigins,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: false              // Simplified for ESP8266
        },

        // ============= PATH AND ADAPTER =============
        path: '/socket.io',
        adapter: createAdapter(pubClient, subClient),

        // ============= ADDITIONAL ESP8266 OPTIMIZATIONS =============
        upgradeTimeout: 30000,              // Allow more time for ESP8266 upgrade
        httpCompression: false,             // Disable compression to reduce ESP8266 load
        serveClient: false,                 // Don't serve socket.io client files

        // ============= CONNECTION STATE RECOVERY =============
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000,  // 2 minutes
            skipMiddlewares: true,
        },
    });

    // ============= ESP8266 SPECIFIC EVENT HANDLERS =============
    io.engine.on("connection_error", (err) => {
        console.log("🔧 Socket.IO connection error (possibly ESP8266):", {
            code: err.code,
            message: err.message,
            context: err.context,
        });
    });

    // Log Engine.IO version for debugging
    console.log("🔌 Socket.IO Server initialized:");
    console.log("   - Engine.IO v3 support: ENABLED");
    console.log("   - Transports: polling, websocket");
    console.log("   - Ping interval: 30s (ESP8266 optimized)");
    console.log("   - Max buffer size: 100KB");

    // Configure CORS once with appropriate settings
    app.use(cors({
        origin: appConfig.corsOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        credentials: true
    }));

    // Khởi tạo routes API
    app.use('/api', routes);

    // Cấu hình Swagger sau khi đã có routes
    configureSwagger(app);

    // Error handling middleware luôn phải ở cuối
    app.use(errorMiddleware);

    return {app, io, httpServer};
};