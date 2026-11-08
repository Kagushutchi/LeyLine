import dotenv from 'dotenv';

dotenv.config();

export const envConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  db: {
    type: (process.env.DB_TYPE || 'sqlite') as 'sqlite' | 'postgres',
    sqlitePath: process.env.DB_SQLITE_PATH || 'clubcurator_db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'clubcurator_db',
    synchronize: process.env.DB_SYNCHRONIZE !== 'false',
    logging: process.env.DB_LOGGING === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'clubcurator-secret-access-token-key-2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'clubcurator-secret-refresh-token-key-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
};
