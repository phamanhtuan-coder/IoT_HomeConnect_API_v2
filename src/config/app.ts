export const appConfig = {
    port: process.env.PORT || (process.env.NODE_ENV === 'production' ? 8443 : 7777),
    corsOrigins: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',')
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:7777', 'http://localhost:8443', 'http://localhost:8888'],
    jwtSecret: process.env.JWT_SECRET || 'y59119840adbf545dd93df5bb8084ee718558f86d0e6e99ea0c27adfa847709bcc5f88e537758e74445f5e1c7f319a86a794f0b8b93fdfebf977bdf9cf69b39b2f51547191379dfc50fd26e72c23588be557dbfd41fb7cb4f45eedb6c941dcf410377630f0dfed7a862f407a79d7a6744715bd76a8a260c81da9e7605455f66c634703793b1d5112300b5ae7e40f70b6b3974228a447a333f82f8fd9d23ea0e041249ee7ef874ef51d6c7aec42cd5f7a4f5dc93be1a8c118b5b1da5e252f0059b4575d8cdc3f08cab692cb102d7fc04046a657feb9490c56e8d97c2c5585fd2e3b1e4b26f8b52387996bf9b684180e237700e8eb68ad8060463cc28855fe81600',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    env: process.env.NODE_ENV || 'development',
};

export type AppConfig = typeof appConfig;
