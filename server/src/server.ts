import { app } from './app';
import { config } from './config';
import { initializeDatabase, prisma } from './services/db';
import { logger } from './utils/logger';

async function startServer() {
  try {
    // 1. Initialize Database with WAL mode
    await initializeDatabase();

    // 2. Start HTTP Listener
    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 Loan Approve Backend running on port ${config.PORT} [${config.NODE_ENV}]`);
      logger.info(`🔗 Health endpoint: http://localhost:${config.PORT}/api/health`);
    });

    // 3. Graceful Shutdown Handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Gracefully shutting down server...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await prisma.$disconnect();
        logger.info('Database connection closed. Exiting process.');
        process.exit(0);
      });

      // Force exit if hanging
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at promise', reason, { promise: String(promise) });
    });
  } catch (error) {
    logger.error('Fatal error during backend startup', error);
    process.exit(1);
  }
}

startServer();
