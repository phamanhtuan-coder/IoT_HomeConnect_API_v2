// src/server.ts
import { initApp } from './app';
import { initSocket } from './sockets';
import { appConfig } from './config/app';
import admin from './config/firebase';
import { setSocketInstance } from './services/device.service';

// Check Firebase Admin initialization
console.log('Firebase Admin SDK version:', admin.SDK_VERSION);

const { app, io } = initApp();

// Initialize sockets
initSocket(io);

// Pass Socket.IO instance to device service
setSocketInstance(io);

app.listen(appConfig.port, () => {
    console.log(`Server is running on port ${appConfig.port}`);
});