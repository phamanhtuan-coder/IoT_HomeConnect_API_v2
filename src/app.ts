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
        pingInterval: 25000,                // Match ESP8266 ping interval
        pingTimeout: 20000,                 // Shorter timeout for ESP8266
        maxHttpBufferSize: 50000,           // Reduced for ESP8266 memory

        // ============= WEBSOCKET SPECIFIC FOR ESP8266 =============
        upgradeTimeout: 10000,              // Faster upgrade timeout
        httpCompression: false,             // Disable to reduce ESP8266 processing
        perMessageDeflate: false,           // Disable WebSocket compression
        serveClient: false,                 // Don't serve client files

        // ============= CONNECTION SETTINGS =============
        allowUpgrades: true,                // Allow transport upgrades
        cookie: false,                      // Disable cookies for ESP8266

        // ============= CORS CONFIGURATION =============
        cors: {
            origin: "*",                    // Allow all origins for ESP8266 testing
            methods: ['GET', 'POST'],
            credentials: false              // Simplified for ESP8266
        },

        // ============= ENGINE.IO SPECIFIC =============
        path: '/socket.io',
        adapter: createAdapter(pubClient, subClient),

        // ============= CONNECTION STATE RECOVERY =============
        connectionStateRecovery: {
            maxDisconnectionDuration: 60000,  // 1 minute for ESP8266
            skipMiddlewares: true,
        },
    });

    // ============= ESP8266 ENHANCED ERROR HANDLING =============
    io.engine.on("connection_error", (err) => {
        console.log("🔧 Socket.IO connection error:", {
            code: err.code,
            message: err.message,
            context: err.context,
            transport: err.transport,
            type: err.type
        });

        // Enhanced ESP8266 specific error detection
        if (err.message === 'Transport unknown') {
            console.log("🔧 ESP8266 Transport Error Detected:");
            console.log("   - This usually indicates WebSocket library compatibility issues");
            console.log("   - Try using WebSocketsClient directly instead of SocketIOclient");
            console.log("   - Verify ESP8266 is using ArduinoWebSockets library v2.3.6 or newer");
            console.log("   - Check if ESP8266 can access /socket.io/?EIO=3&transport=websocket");
        }

        if (err.code === 1) {
            console.log("🔧 Engine.IO Transport Error:");
            console.log("   - Check if ESP8266 is sending correct transport in handshake");
            console.log("   - Verify WebSocket upgrade is working properly");
        }
    });

    // Enhanced connection debugging with error handling
    io.engine.on("initial_headers", (headers, req) => {
        try {
            const userAgent = req?.headers?.['user-agent'] || 'unknown';
            const transport = req?.query?.transport || 'unknown';
            const eio = req?.query?.EIO || 'unknown';

            console.log("🔧 Initial headers from client:", {
                userAgent,
                transport,
                EIO: eio,
                url: req?.url || 'unknown'
            });

            // Detect ESP8266 clients
            if (userAgent.includes('ESP8266') || userAgent.includes('ArduinoWebSockets')) {
                console.log("📡 ESP8266 client detected in initial headers");

                // Add ESP8266-friendly headers
                headers['Access-Control-Allow-Origin'] = '*';
                headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
                headers['Access-Control-Allow-Headers'] = 'Content-Type';
            }
        } catch (error) {
            console.error("Error in initial_headers handler:", error);
        }
    });

    // WebSocket upgrade logging
    io.engine.on("upgrade", (socket) => {
        console.log("🔌 WebSocket upgrade successful:", {
            id: socket.id,
            transport: socket.transport?.name || 'unknown',
            readyState: socket.readyState
        });
    });

    // Enhanced connection logging
    io.engine.on("connection", (socket) => {
        console.log("✅ Engine.IO connection established:", {
            id: socket.id,
            transport: socket.transport?.name || 'unknown',
            userAgent: socket.request?.headers?.['user-agent'] || 'unknown'
        });
    });

    // ============= ESP8266 PING/PONG HANDLING =============
    io.engine.on("ping", (socket) => {
        console.log(`🏓 Engine.IO ping from ${socket.id}`);
    });

    io.engine.on("pong", (socket) => {
        console.log(`🏓 Engine.IO pong from ${socket.id}`);
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