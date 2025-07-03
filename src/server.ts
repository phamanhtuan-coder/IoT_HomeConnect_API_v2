// src/server.ts
import 'dotenv/config';
import { initApp } from './app';
import { initSocket } from './sockets';
import { appConfig } from './config/app';
import admin from './config/firebase';
import { setSocketInstance } from './services/device.service';

// Check Firebase Admin initialization
console.log('Firebase Admin SDK version:', admin.SDK_VERSION);

const { app, io, httpServer } = initApp();

// Initialize sockets
initSocket(io);

// Pass Socket.IO instance to device.ts service
setSocketInstance(io);

// Use httpServer instead of app.listen to properly support Socket.IO
httpServer.listen(Number(appConfig.port), '0.0.0.0', () => {
    console.log(`Server is running on port ${appConfig.port} in ${appConfig.env} mode`);
});

