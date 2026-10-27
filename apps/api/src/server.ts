import { env } from './config/env';
import { logger } from './shared/logger';
import { initDatabase } from './shared/db';
import { createApp } from './app';

async function main() {
  await initDatabase();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API hazır: http://localhost:${env.PORT}${env.API_BASE_PATH}`);
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Kapatılıyor');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Sunucu başlatılamadı');
  process.exit(1);
});
