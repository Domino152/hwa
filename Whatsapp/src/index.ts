import { config } from './config/index.js';
import { SHUTDOWN_TIMEOUT_MS } from './config/constants.js';
import { connectDB, disconnectDB } from './database/index.js';
import { createHttpServer } from './server.js';
import { chatService } from './modules/whatsapp/whatsapp.routes.js';
import logger from './shared/utils/logger.js';

async function bootstrap(): Promise<void> {
  try {
    logger.info({ nodeEnv: config.NODE_ENV, port: config.PORT }, 'Starting application');

    await connectDB();

    const httpServer = createHttpServer();

    try {
      await chatService.initialize();
    } catch (err) {
      logger.warn({ err }, 'WhatsApp service failed to initialize — will retry');
    }

    httpServer.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, `Server running on port ${config.PORT}`);
      logger.info({ url: `http://localhost:${config.PORT}/api/docs` }, 'API docs available');
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start application');
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Received shutdown signal');

  const timeout = setTimeout(() => {
    logger.error('Shutdown timed out — forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    await chatService.logout();
    await disconnectDB();
    logger.info('Graceful shutdown complete');
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
  } finally {
    clearTimeout(timeout);
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err: Error) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

bootstrap();
