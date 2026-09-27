import 'reflect-metadata';
import { createApp } from './app';
import { envConfig } from './config/env.config';
import { AppDataSource } from './config/database.config';
import { logger } from './common/utils/logger';

async function bootstrap(): Promise<void> {
  try {
    logger.info('Iniciando conexión a base de datos...');
    await AppDataSource.initialize();
    logger.info(`Base de datos conectada correctamente [Motor: ${envConfig.db.type}]`);

    const app = createApp();

    const server = app.listen(envConfig.port, () => {
      logger.info(`Servidor escuchando en http://localhost:${envConfig.port}`);
      logger.info(`Ambiente: ${envConfig.nodeEnv}`);
    });

    const shutdown = async (signal: string) => {
      logger.warn(`Señal ${signal} recibida. Cerrando servidor y conexiones...`);
      server.close(async () => {
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
          logger.info('Conexión a base de datos cerrada.');
        }
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('Error fatal al iniciar la aplicación:', error);
    process.exit(1);
  }
}

bootstrap();
