import { Router } from 'express';
import { SuscripcionController } from './suscripcion.controller';

/**
 * Rutas para el módulo de Suscripciones (Pedidos)
 */
export const createSuscripcionRouter = (controller: SuscripcionController): Router => {
  const router = Router();

  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.patch('/:id/pausar', controller.pause);
  router.patch('/:id/cancelar', controller.cancel);

  return router;
};
