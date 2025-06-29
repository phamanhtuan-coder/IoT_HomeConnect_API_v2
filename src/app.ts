// src/app.ts - Updated for ESP8266 WebSocket compatibility
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

    // ============= ENHANCED ESP8266 SOCKET.IO CONFIGURATION =============
    const io = new Server(httpServer, {
        // ============= ESP8266 CRITICAL COMPATIBILITY =============
        allowEIO3: true,                    // ESSENTIAL: Enable Engine.IO v3 for ESP8266
        transports: ['websocket', 'polling'], // Support both, but prioritize WebSocket

        // ============= ESP8266 OPTIMIZED TIMING =============
        pingInterval: 25000,                // 25 seconds ping interval
        pingTimeout: 20000,                 // 20 seconds ping timeout
        maxHttpBufferSize: 50000,           // 50KB buffer size for ESP8266

        // ============= CONNECTION STABILITY =============
        connectTimeout: 60000,              // 60 second connection timeout
        upgradeTimeout: 10000,              // 10 second upgrade timeout

        // ============= MEMORY OPTIMIZATION =============
        httpCompression: false,             // Disable compression for ESP8266
        perMessageDeflate: false,           // Disable WebSocket compression

        // ============= RECONNECTION SETTINGS =============
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000,  // 2 minutes max disconnection
            skipMiddlewares: true,
        },

        // ============= MISC SETTINGS =============
        serveClient: false,                 // Don't serve client files
        allowUpgrades: true,                // Allow transport upgrades
        cookie: false,                      // Disable cookies for ESP8266
        cors: {
            origin: "*",                    // Allow all origins for ESP8266
            methods: ['GET', 'POST'],
            credentials: false              // No credentials needed
        },

        // ============= ADAPTER CONFIGURATION =============
        adapter: createAdapter(pubClient, subClient)
    });

    // ============= ESP8266 CONNECTION MONITORING =============
    io.engine.on("connection_error", (err) => {
        console.log("🔧 Socket.IO connection error:", {
            code: err.code,
            message: err.message,
            context: err.context,
            transport: err.transport?.name || 'unknown',
            type: err.type
        });

        // Enhanced ESP8266 specific error detection
        if (err.message?.includes('Transport unknown') || err.code === 0) {
            console.log(`
🔧 ESP8266 Connection Troubleshooting:
   - Check if device is using compatible WebSocket library
   - Verify network stability and firewall settings
   - Ensure proper connection parameters are being used
   - Monitor device memory usage during connection
            `);
        }
    });

    // Monitor successful transport upgrades
    io.engine.on("upgrade", (socket) => {
        console.log(`🔌 Connection upgraded for socket ${socket.id}:`, {
            transport: socket.transport?.name || 'unknown',
            readyState: socket.readyState
        });
    });

    // Track connection establishment
    io.engine.on("connection", (socket) => {
        const query = socket.request?._query || {};
        console.log(`✅ New connection established:`, {
            id: socket.id,
            transport: socket.transport?.name || 'unknown',
            userAgent: socket.request?.headers?.['user-agent'] || 'unknown',
            serialNumber: query.serialNumber || 'unknown'
        });
    });

    // Monitor disconnections
    io.engine.on("closing", (socket) => {
        console.log(`🔌 Connection closing for socket ${socket.id}:`, {
            transport: socket.transport?.name || 'unknown',
            reason: socket.closeReason || 'unknown'
        });
    });

    // ============= INITIALIZATION LOGGING =============
    console.log("🔌 Socket.IO Server initialized with ESP8266 compatibility:");
    console.log("   - Engine.IO v3 support: ENABLED");
    console.log("   - Transports: websocket (priority), polling (fallback)");
    console.log("   - Ping interval: 25s (ESP8266 optimized)");
    console.log("   - Max buffer size: 50KB");
    console.log("   - WebSocket compression: DISABLED");
    console.log("   - HTTP compression: DISABLED");
    console.log("   - Upgrade timeout: 10s");

    // Configure CORS middleware
    app.use(cors({
        origin: "*", // Allow all origins for ESP8266 testing - restrict in production
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        credentials: false // Simplified for ESP8266
    }));

    // ============= HEALTH CHECK ENDPOINT FOR ESP8266 =============
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            socketio: {
                engine_version: '6.5.x',
                eio3_support: true,
                transports: ['websocket', 'polling'],
                esp8266_compatible: true
            },
            timestamp: new Date().toISOString()
        });
    });

    // ============= ESP8266 CONNECTION TEST ENDPOINT =============
    app.get('/socket.io/test', (req, res) => {
        res.json({
            message: 'Socket.IO server is running',
            eio3_support: true,
            esp8266_compatible: true,
            websocket_path: '/socket.io/?EIO=3&transport=websocket',
            polling_path: '/socket.io/?EIO=3&transport=polling'
        });
    });

    // Khởi tạo routes API
    app.use('/api', routes);

    // Cấu hình Swagger sau khi đã có routes
    configureSwagger(app);

    // Error handling middleware luôn phải ở cuối
    app.use(errorMiddleware);

    return {app, io, httpServer};
};