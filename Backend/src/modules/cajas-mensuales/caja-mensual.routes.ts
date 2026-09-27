import { Router } from 'express';
import { CajaMensualController } from './caja-mensual.controller';

/**
 * Rutas para el módulo de Cajas Mensuales (Productos)
 */
export const createCajaMensualRouter = (controller: CajaMensualController): Router => {
  const router = Router();

  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.post('/recomendar', controller.recommend);

  return router;
};
