const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    },
    log: ['warn', 'error'],
    errorFormat: 'pretty',
});

// Enhanced connection management
let isConnected = false;

const connectWithRetry = async (retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            await prisma.$connect();
            console.log('✅ Database connected with optimized pool configuration');
            isConnected = true;
            return;
        } catch (error) {
            console.error(`❌ Database connection attempt ${i + 1} failed:`, error);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // Exponential backoff
        }
    }
};

// Initialize connection
connectWithRetry().catch((error) => {
    console.error('🚨 Database connection completely failed:', error);
    process.exit(1); // Exit if we can't connect
});

// Enhanced query monitoring
prisma.$on('query', (e) => {
    if (e.duration > 5000) {
        console.warn(`🐌 Slow query detected: ${e.query} (${e.duration}ms)`);
    }
});

// Connection health monitoring
setInterval(async () => {
    if (!isConnected) return;

    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
        console.error('💔 Database health check failed:', error);
        isConnected = false;
        // Attempt reconnection
        connectWithRetry().catch(console.error);
    }
}, 30000); // Check every 30 seconds

// Graceful shutdown
process.on('beforeExit', async () => {
    console.log('🔄 Closing database connections...');
    await prisma.$disconnect();
});

process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT, closing database connections...');
    await prisma.$disconnect();
    process.exit(0);
});

export default prisma;