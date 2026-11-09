import { Router, Request, Response, NextFunction } from "express";
import { optionalAuthMiddleware } from "../../../common/middlewares/auth.middleware";
import { SuscriptorRepository } from "../../suscriptores/infrastructure/suscriptor-repository";
import SuscripcionesController from "./controller";

class SuscripcionesRouter {
  private router: Router;
  private controller: SuscripcionesController;
  private BASE_URL = '/';

  constructor() {
    this.controller = new SuscripcionesController();
    this.router = this.createRouter();
  }

  public getRouter(): Router {
    return this.router;
  }

  public createRouter(): Router {
    const router = Router();

    router.get(this.BASE_URL, optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        let tenantId: string | undefined = undefined;
        let suscriptorId: string | undefined = undefined;

        if (req.user) {
          if (req.user.role === 'admin') {
            tenantId = req.tenantId || req.user.tenantId;
          } else if (req.user.role === 'subscriptor') {
            const suscriptorRepo = new SuscriptorRepository();
            const all = await suscriptorRepo.findAll();
            const matching = all.find((s) => s.email?.toLowerCase() === req.user?.email?.toLowerCase());
            suscriptorId = matching ? matching.id : req.user.userId;
          }
        }

        const result = await this.controller.getSuscripciones(tenantId, suscriptorId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.get(`${this.BASE_URL}cliente/:suscriptorId`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { suscriptorId } = req.params;
        const result = await this.controller.getSuscripcionesBySuscriptor(suscriptorId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.get(`${this.BASE_URL}suscriptor/:suscriptorId`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.controller.getSuscripcionesBySuscriptor(req.params.suscriptorId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.get(`${this.BASE_URL}:id`, optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const tenantId = req.user?.role === 'admin' ? (req.tenantId || req.user.tenantId) : undefined;
        const result = await this.controller.getSuscripcionById(id, tenantId);
        if (!result) {
          return res.status(404).json({ status: 'error', message: 'Suscripción no encontrada' });
        }
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.post(this.BASE_URL, optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        let tenantId = req.body.tenantId;

        if (req.user) {
          if (req.user.role === 'admin' && req.user.tenantId) {
            tenantId = req.user.tenantId;
            req.body.tenantId = tenantId;
          } else if (req.user.role === 'subscriptor') {
            const suscriptorRepo = new SuscriptorRepository();
            const all = await suscriptorRepo.findAll();
            const matching = all.find((s) => s.email?.toLowerCase() === req.user?.email?.toLowerCase());
            if (matching) {
              req.body.suscriptorId = matching.id;
            }
          }
        }

        const result = await this.controller.createSuscripcion(req.body, tenantId);
        res.status(201).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.put(`${this.BASE_URL}:id/pausar`, optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.pauseSuscripcion(id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.patch(`${this.BASE_URL}:id/pausar`, optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.pauseSuscripcion(id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.put(`${this.BASE_URL}:id/cancelar`, optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.cancelSuscripcion(id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.patch(`${this.BASE_URL}:id/cancelar`, optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.cancelSuscripcion(id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.put(`${this.BASE_URL}:id`, optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.updateSuscripcion(id, req.body);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.delete(`${this.BASE_URL}:id`, optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.deleteSuscripcion(id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    return router;
  }
}

export default new SuscripcionesRouter().getRouter();
