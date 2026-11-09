import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { envConfig } from './config/env.config';
import { AppDataSource, getDataSource } from './config/database.config';
import { openapiDocument } from './config/openapi';
import { loggerMiddleware } from './common/middlewares/logger.middleware';
import { errorHandlerMiddleware } from './common/middlewares/error.middleware';

// Routers de presentación (Arquitectura DDD)
import authRouter from './modules/auth/presentation/auth-router';
import suscriptoresRouter from './modules/suscriptores/presentation/suscriptores-router';
import suscripcionesRouter from './modules/suscripciones/presentation/suscripciones-router';
import cajasMensualesRouter from './modules/cajas-mensuales/presentation/cajas-mensuales-router';
import productosRouter from './modules/productos/presentation/productos-router';
import { createSolicitudesRouter } from './modules/solicitudes-suscripcion/presentation/solicitudes-router';
import { setupInventarioSoap } from './modules/inventario/soap/inventario-server';

export const createApp = async (): Promise<Application> => {
  const app: Application = express();

  // Middlewares globales
  app.use(cors({ origin: envConfig.corsOrigin }));
  app.use(express.json());
  app.use(loggerMiddleware);

  // Healthcheck
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'ClubCurator API',
      database: envConfig.db.type,
      databaseConnected: AppDataSource.isInitialized,
      timestamp: new Date().toISOString(),
    });
  });

  // Documentación OpenAPI / Swagger
  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.status(200).json(openapiDocument);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

  // Rutas de Módulos (DDD)
  app.use('/api/auth', authRouter);
  app.use('/api/suscriptores', suscriptoresRouter);
  app.use('/api/suscripciones', suscripcionesRouter);
  app.use('/api/cajas-mensuales', cajasMensualesRouter);
  app.use('/api/productos', productosRouter);
  // Only accept new requests when a worker/relay can process them (see QUEUE_RUNTIME_ENABLED).
  if (process.env.SUBSCRIPTION_REQUESTS_ENABLED === 'true') {
    app.use('/api/solicitudes-suscripcion', createSolicitudesRouter(getDataSource()));
  }

  // Servicio SOAP de inventario (contrato en docs/soap/inventario.wsdl)
  setupInventarioSoap(app);

  // Middleware de captura de errores
  app.use(errorHandlerMiddleware);

  return app;
};
