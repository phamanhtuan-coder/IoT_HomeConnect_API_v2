// src/config/app.ts
export const appConfig = {
    port: process.env.PORT || 3000,
    corsOrigins: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',')
        : ['http://localhost:3000', 'http://localhost:8080'],
    jwtSecret: process.env.JWT_SECRET || 'your-very-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    env: process.env.NODE_ENV || 'development',
};

export type AppConfig = typeof appConfig;