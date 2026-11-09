import { Router, Request, Response, NextFunction } from "express";
import SuscripcionesController from "./controller";
import { validateBody, validateParams } from "../../../common/middlewares/validation.middleware";
import {
  createSuscripcionSchema,
  updateSuscripcionSchema,
  suscripcionIdParamSchema,
  suscriptorIdParamSchema,
} from "./suscripcion.schema";
import { optionalAuthMiddleware } from "../../../common/middlewares/auth.middleware";
import { tenantScopeMiddleware } from "../../../common/middlewares/tenant.middleware";

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

  // Nota de diseño: a diferencia de productos/suscriptores/cajas-mensuales, las
  // suscripciones son auto-gestionables (un cliente puede suscribirse sin ser
  // administrador). Por eso se usa optionalAuthMiddleware en vez de exigir rol admin:
  // si hay un administrador autenticado, sus operaciones quedan acotadas a su propio
  // tenant (tenantScopeMiddleware + assertTenantOwnership en los casos de uso);
  // si no hay sesión, el flujo público de autogestión sigue funcionando como antes.
  public createRouter(): Router {
    const router = Router();

    router.get(this.BASE_URL, async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.controller.getSuscripciones();
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.get(`${this.BASE_URL}cliente/:suscriptorId`, validateParams(suscriptorIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { suscriptorId } = req.params;
        const result = await this.controller.getSuscripcionesBySuscriptor(suscriptorId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.get(`${this.BASE_URL}suscriptor/:suscriptorId`, validateParams(suscriptorIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.controller.getSuscripcionesBySuscriptor(req.params.suscriptorId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.get(`${this.BASE_URL}:id`, validateParams(suscripcionIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.getSuscripcionById(id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.post(
      this.BASE_URL,
      optionalAuthMiddleware,
      tenantScopeMiddleware,
      validateBody(createSuscripcionSchema),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const result = await this.controller.createSuscripcion(req.body, req.tenantId);
          res.status(201).json({ status: 'success', data: result });
        } catch (error) {
          next(error);
        }
      }
    );

    router.put(`${this.BASE_URL}:id/pausar`, optionalAuthMiddleware, tenantScopeMiddleware, validateParams(suscripcionIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.pauseSuscripcion(id, req.tenantId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.patch(`${this.BASE_URL}:id/pausar`, optionalAuthMiddleware, tenantScopeMiddleware, validateParams(suscripcionIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.pauseSuscripcion(id, req.tenantId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.put(`${this.BASE_URL}:id/cancelar`, optionalAuthMiddleware, tenantScopeMiddleware, validateParams(suscripcionIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.cancelSuscripcion(id, req.tenantId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.patch(`${this.BASE_URL}:id/cancelar`, optionalAuthMiddleware, tenantScopeMiddleware, validateParams(suscripcionIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.cancelSuscripcion(id, req.tenantId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.put(
      `${this.BASE_URL}:id`,
      optionalAuthMiddleware,
      tenantScopeMiddleware,
      validateParams(suscripcionIdParamSchema),
      validateBody(updateSuscripcionSchema),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { id } = req.params;
          const result = await this.controller.updateSuscripcion(id, req.body, req.tenantId);
          res.status(200).json({ status: 'success', data: result });
        } catch (error) {
          next(error);
        }
      }
    );

    router.delete(`${this.BASE_URL}:id`, optionalAuthMiddleware, tenantScopeMiddleware, validateParams(suscripcionIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.deleteSuscripcion(id, req.tenantId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    return router;
  }
}

export default new SuscripcionesRouter().getRouter();
