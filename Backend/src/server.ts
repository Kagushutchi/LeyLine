import 'reflect-metadata';
import { createApp, dataSource } from './app';
import { envConfig } from './config/env.config';
import { logger } from './common/utils/logger';

async function bootstrap(): Promise<void> {
  try {
    logger.info('Iniciando conexión a base de datos y servidor...');
    const app = await createApp();
    logger.info(`Base de datos conectada correctamente [Motor: ${envConfig.db.type}]`);

    const server = app.listen(envConfig.port, () => {
      logger.info(`Servidor escuchando en http://localhost:${envConfig.port}`);
      logger.info(`Ambiente: ${envConfig.nodeEnv}`);
    });

    const shutdown = async (signal: string) => {
      logger.warn(`Señal ${signal} recibida. Cerrando servidor y conexiones...`);
      server.close(async () => {
        if (dataSource && dataSource.isInitialized) {
          await dataSource.destroy();
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
