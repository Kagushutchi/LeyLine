import dotenv from 'dotenv';

dotenv.config();

const port = parseInt(process.env.PORT || '3000', 10);

export const envConfig = {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  db: {
    type: (process.env.DB_TYPE || 'sqlite') as 'sqlite' | 'postgres',
    sqlitePath: process.env.DB_SQLITE_PATH || 'clubcurator.sqlite',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'clubcurator_db',
    synchronize: process.env.DB_SYNCHRONIZE !== 'false',
    logging: process.env.DB_LOGGING === 'true',
  },
  soap: {
    inventarioEnabled: process.env.SOAP_INVENTARIO_ENABLED !== 'false',
    inventarioUrl: process.env.SOAP_INVENTARIO_URL || `http://localhost:${port}/soap/inventario`,
    timeoutMs: parseInt(process.env.SOAP_TIMEOUT_MS || '5000', 10),
  },
};
