import { Router, Request, Response, NextFunction } from "express";
import { optionalAuthMiddleware, authMiddleware } from "../../../common/middlewares/auth.middleware";
import { requireRole } from "../../../common/middlewares/roles.middleware";
import { tenantScopeMiddleware } from "../../../common/middlewares/tenant.middleware";
import SuscriptoresController from "./controller";

class SuscriptoresRouter {
  private router: Router;
  private controller: SuscriptoresController;

  constructor() {
    this.controller = new SuscriptoresController();
    this.router = this.createRouter();
  }

  public getRouter() {
    return this.router;
  }

  public createRouter() {
    const router = Router();

    // GET /api/suscriptores (Aislado por tenant si está autenticado como admin)
    router.get('/', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.user?.role === 'admin' ? (req.tenantId || req.user.tenantId) : undefined;
        const result = await this.controller.getSuscriptores(tenantId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    // GET /api/suscriptores/:id
    router.get('/:id', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.user?.role === 'admin' ? (req.tenantId || req.user.tenantId) : undefined;
        const result = await this.controller.getSuscriptorById(req.params.id, tenantId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    // POST /api/suscriptores
    router.post('/', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        let tenantId = req.body.tenantId;
        if (req.user?.role === 'admin') {
          tenantId = req.tenantId || req.user.tenantId;
          req.body.tenantId = tenantId;
        }
        const result = await this.controller.createSuscriptor(req.body, tenantId);
        res.status(201).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    // PUT /api/suscriptores/:id
    router.put('/:id', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.user?.role === 'admin' ? (req.tenantId || req.user.tenantId) : undefined;
        const result = await this.controller.updateSuscriptor(req.params.id, req.body, tenantId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    // DELETE /api/suscriptores/:id
    router.delete('/:id', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.user?.role === 'admin' ? (req.tenantId || req.user.tenantId) : undefined;
        const result = await this.controller.deleteSuscriptor(req.params.id, tenantId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    return router;
  }
}

export default new SuscriptoresRouter().getRouter();
