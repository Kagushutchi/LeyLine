import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { envConfig } from './config/env.config';
import { AppDataSource } from './config/database.config';
import { loggerMiddleware } from './common/middlewares/logger.middleware';
import { errorHandlerMiddleware } from './common/middlewares/error.middleware';

// Entidades
import { Suscriptor } from './modules/suscriptores/suscriptor.entity';
import { Suscripcion } from './modules/suscripciones/suscripcion.entity';
import { CajaMensual } from './modules/cajas-mensuales/caja-mensual.entity';

// Módulos: Suscriptores
import { SuscriptorRepository } from './modules/suscriptores/suscriptor.repository';
import { SuscriptorService } from './modules/suscriptores/suscriptor.service';
import { SuscriptorController } from './modules/suscriptores/suscriptor.controller';
import { createSuscriptorRouter } from './modules/suscriptores/suscriptor.routes';

// Módulos: Suscripciones
import { SuscripcionRepository } from './modules/suscripciones/suscripcion.repository';
import { SuscripcionService } from './modules/suscripciones/suscripcion.service';
import { SuscripcionController } from './modules/suscripciones/suscripcion.controller';
import { createSuscripcionRouter } from './modules/suscripciones/suscripcion.routes';

// Módulos: Cajas Mensuales
import { CajaMensualRepository } from './modules/cajas-mensuales/caja-mensual.repository';
import { CajaMensualService } from './modules/cajas-mensuales/caja-mensual.service';
import { CajaMensualController } from './modules/cajas-mensuales/caja-mensual.controller';
import { createCajaMensualRouter } from './modules/cajas-mensuales/caja-mensual.routes';

export const createApp = (): Application => {
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
      timestamp: new Date().toISOString(),
    });
  });

  // Inyección de dependencias y ensamblado de rutas
  // Suscriptores
  const suscriptorRepo = new SuscriptorRepository(AppDataSource.getRepository(Suscriptor));
  const suscriptorService = new SuscriptorService(suscriptorRepo);
  const suscriptorController = new SuscriptorController(suscriptorService);
  app.use('/api/suscriptores', createSuscriptorRouter(suscriptorController));

  // Suscripciones
  const suscripcionRepo = new SuscripcionRepository(AppDataSource.getRepository(Suscripcion));
  const suscripcionService = new SuscripcionService(suscripcionRepo);
  const suscripcionController = new SuscripcionController(suscripcionService);
  app.use('/api/suscripciones', createSuscripcionRouter(suscripcionController));

  // Cajas Mensuales
  const cajaMensualRepo = new CajaMensualRepository(AppDataSource.getRepository(CajaMensual));
  const cajaMensualService = new CajaMensualService(cajaMensualRepo);
  const cajaMensualController = new CajaMensualController(cajaMensualService);
  app.use('/api/cajas-mensuales', createCajaMensualRouter(cajaMensualController));

  // Middleware de captura de errores
  app.use(errorHandlerMiddleware);

  return app;
};
