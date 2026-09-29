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
