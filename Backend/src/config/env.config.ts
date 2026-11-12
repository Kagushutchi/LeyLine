import dotenv from 'dotenv';

dotenv.config();

const port = parseInt(process.env.PORT || '3000', 10);

export const envConfig = {
  port,
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
  soap: {
    inventarioEnabled: process.env.SOAP_INVENTARIO_ENABLED !== 'false',
    inventarioUrl: process.env.SOAP_INVENTARIO_URL || `http://localhost:${port}/soap/inventario`,
    timeoutMs: parseInt(process.env.SOAP_TIMEOUT_MS || '5000', 10),
  },
  payments: {
    /** 'none' conserva el alta directa sin cobro; 'fake' y 'stripe' activan el flujo de pago. */
    provider: (process.env.PAYMENT_PROVIDER || 'none') as 'none' | 'fake' | 'stripe',
    /** Moneda en la que están expresados los precios de las cajas. */
    baseCurrency: (process.env.PAYMENT_BASE_CURRENCY || 'ars').toLowerCase(),
    /** Moneda en la que cobra el proveedor de pago. */
    currency: (process.env.PAYMENT_CURRENCY || 'ars').toLowerCase(),
    /** Unidades de moneda base por 1 unidad de moneda de cobro (p. ej. 1200 = 1200 ARS por 1 USD). Obligatorio si difieren. */
    fxRate: process.env.PAYMENT_FX_RATE ? Number(process.env.PAYMENT_FX_RATE) : null,
    /** Minutos de vigencia del checkout (Stripe exige entre 30 minutos y 24 horas). */
    checkoutTtlMinutes: Number(process.env.PAYMENT_CHECKOUT_TTL_MINUTES) || 30,
    portalReturnUrl: process.env.PAYMENT_PORTAL_RETURN_URL || 'http://localhost:5173/catalogo',
    successUrl: process.env.PAYMENT_SUCCESS_URL || 'http://localhost:5173/catalogo?pago=exito',
    cancelUrl: process.env.PAYMENT_CANCEL_URL || 'http://localhost:5173/catalogo?pago=cancelado',
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    fakeWebhookSecret: process.env.FAKE_PAYMENT_WEBHOOK_SECRET || 'fake-webhook-secret',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'clubcurator-secret-access-token-key-2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'clubcurator-secret-refresh-token-key-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  },
};
