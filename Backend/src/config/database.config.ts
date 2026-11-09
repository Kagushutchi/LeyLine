import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { envConfig } from './env.config';
import { logger } from '../common/utils/logger';
import { entities } from '../common/patterns/factory/entities';

/**
 * Patrón Factory: DatabaseFactory
 * Crea dinámicamente la instancia de DataSource configurada para PostgreSQL o SQLite.
 */
export class DatabaseFactory {
  public static createDataSource(): DataSource {
    const isPostgres = envConfig.db.type === 'postgres';

    if (isPostgres) {
      logger.info('Configurando DataSource para PostgreSQL...');
      return new DataSource({
        type: 'postgres',
        host: envConfig.db.host,
        port: envConfig.db.port,
        username: envConfig.db.username,
        password: envConfig.db.password,
        database: envConfig.db.database,
        synchronize: envConfig.db.synchronize,
        logging: envConfig.db.logging,
        entities,
        migrations: [__dirname + '/../migrations/*.{ts,js}'],
      });
    }

    logger.info(`Configurando DataSource para SQLite (${envConfig.db.sqlitePath})...`);
    return new DataSource({
      type: 'sqlite',
      database: envConfig.db.sqlitePath,
      synchronize: envConfig.db.synchronize,
      logging: envConfig.db.logging,
      entities,
      migrations: [__dirname + '/../migrations/*.{ts,js}'],
    });
  }
}

export const AppDataSource = DatabaseFactory.createDataSource();

/**
 * Punto único de acceso a la conexión activa.
 * Evita que los repositorios dependan del módulo de la aplicación (app.ts)
 * y garantiza que la conexión ya fue inicializada antes de usarse.
 */
let activeDataSource: DataSource = AppDataSource;

/** Test hook: lets tests run the real repositories against an in-memory DataSource. */
export const setActiveDataSource = (dataSource: DataSource | null): void => {
  activeDataSource = dataSource ?? AppDataSource;
};

export const getDataSource = (): DataSource => {
  if (!activeDataSource.isInitialized) {
    throw new Error(
      'La conexión a la base de datos no está inicializada. ' +
        'Invocá AppDataSource.initialize() antes de usar los repositorios.'
    );
  }
  return activeDataSource;
};
