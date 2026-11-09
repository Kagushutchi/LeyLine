import { NextFunction, Request, Response, Router } from 'express';
import ProductosController from './controller';
import { validateBody, validateParams } from '../../../common/middlewares/validation.middleware';
import { createProductoSchema, updateProductoSchema, productoIdParamSchema } from './producto.schema';
import { authMiddleware, optionalAuthMiddleware } from '../../../common/middlewares/auth.middleware';
import { requireRole } from '../../../common/middlewares/roles.middleware';
import { tenantScopeMiddleware } from '../../../common/middlewares/tenant.middleware';

class ProductosRouter {
  private readonly controller = new ProductosController();
  private readonly router = Router();

  constructor() {
    // Catálogo: si un admin está autenticado, lista solo sus productos. Público/cliente ve catálogo general.
    this.router.get(
      '/',
      optionalAuthMiddleware,
      this.handle(async (req) => {
        const tenantId = req.user?.role === 'admin' ? req.user.tenantId : undefined;
        return this.controller.getAll(tenantId);
      })
    );
    this.router.get(
      '/:id',
      optionalAuthMiddleware,
      validateParams(productoIdParamSchema),
      this.handle(async (req) => {
        const tenantId = req.user?.role === 'admin' ? req.user.tenantId : undefined;
        return this.controller.getById(req.params.id, tenantId);
      })
    );

    // Escritura: sólo administradores autenticados, acotados a su propio tenant.
    this.router.post(
      '/',
      authMiddleware,
      requireRole(['admin']),
      tenantScopeMiddleware,
      validateBody(createProductoSchema),
      this.handle(async (req) => this.controller.create(req.body, req.tenantId), 201)
    );
    this.router.put(
      '/:id',
      authMiddleware,
      requireRole(['admin']),
      tenantScopeMiddleware,
      validateParams(productoIdParamSchema),
      validateBody(updateProductoSchema),
      this.handle(async (req) => this.controller.update(req.params.id, req.body, req.tenantId))
    );
    this.router.delete(
      '/:id',
      authMiddleware,
      requireRole(['admin']),
      tenantScopeMiddleware,
      validateParams(productoIdParamSchema),
      this.handle(async (req) => this.controller.delete(req.params.id, req.tenantId))
    );
  }

  private handle(action: (req: Request) => Promise<unknown>, status = 200) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try { res.status(status).json({ status: 'success', data: await action(req) }); }
      catch (error) { next(error); }
    };
  }

  getRouter() { return this.router; }
}

export default new ProductosRouter().getRouter();
