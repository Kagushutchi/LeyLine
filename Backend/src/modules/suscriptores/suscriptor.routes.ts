import { Router } from 'express';
import { SuscriptorController } from './suscriptor.controller';

/**
 * Rutas para el módulo de Suscriptores
 */
export const createSuscriptorRouter = (controller: SuscriptorController): Router => {
  const router = Router();

  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.patch('/:id/preferencias', controller.updatePreferences);

  return router;
};
