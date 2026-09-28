import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { envConfig } from './config/env.config';
import { loggerMiddleware } from './common/middlewares/logger.middleware';
import { errorHandlerMiddleware } from './common/middlewares/error.middleware';
import { DataSource } from 'typeorm';
import DBEngineFactory from './common/patterns/factory/db-engine-factory';

// Routers de presentación (Arquitectura DDD)
import suscriptoresRouter from './modules/suscriptores/presentation/suscriptores-router';
import suscripcionesRouter from './modules/suscripciones/presentation/suscripciones-router';
import cajasMensualesRouter from './modules/cajas-mensuales/presentation/cajas-mensuales-router';

export let dataSource: DataSource;

export const createApp = async (): Promise<Application> => {
  const app: Application = express();

  const database = DBEngineFactory.createDBEngine();
  dataSource = await database.connectDB();

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
      timestamp: new Date().toISOString(),
    });
  });

  // Rutas de Módulos (DDD)
  app.use('/api/suscriptores', suscriptoresRouter);
  app.use('/api/suscripciones', suscripcionesRouter);
  app.use('/api/cajas-mensuales', cajasMensualesRouter);

  // Middleware de captura de errores
  app.use(errorHandlerMiddleware);

  return app;
};
