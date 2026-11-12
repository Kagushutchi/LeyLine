import { Router, Request, Response, NextFunction } from "express";
import CajasMensualesController from "./controller";
import { validateBody, validateParams } from "../../../common/middlewares/validation.middleware";
import {
  createCajaMensualSchema,
  updateCajaMensualSchema,
  recommendCajaMensualSchema,
  recommendCajaMensualGeneralSchema,
  cajaMensualIdParamSchema,
  periodoParamSchema,
} from "./caja-mensual.schema";
import { authMiddleware, optionalAuthMiddleware } from "../../../common/middlewares/auth.middleware";
import { requireRole } from "../../../common/middlewares/roles.middleware";
import { tenantScopeMiddleware } from "../../../common/middlewares/tenant.middleware";

class CajasMensualesRouter {
  private router: Router;
  private controller: CajasMensualesController;
  private BASE_URL = '/';

  constructor() {
    this.controller = new CajasMensualesController();
    this.router = this.createRouter();
  }

  public getRouter(): Router {
    return this.router;
  }

  public createRouter(): Router {
    const router = Router();

    // Catálogo: si un admin está autenticado, lista solo sus cajas. Público/cliente ve catálogo general.
    router.get(this.BASE_URL, optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = req.user?.role === 'admin' ? req.user.tenantId : undefined;
        const result = await this.controller.getCajasMensuales(tenantId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.get(`${this.BASE_URL}periodo/:anio/:mes`, validateParams(periodoParamSchema), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const anio = parseInt(req.params.anio, 10);
        const mes = parseInt(req.params.mes, 10);
        const result = await this.controller.getCajasByMesAnio(mes, anio);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.get(`${this.BASE_URL}:id`, optionalAuthMiddleware, validateParams(cajaMensualIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const tenantId = req.user?.role === 'admin' ? req.user.tenantId : undefined;
        const result = await this.controller.getCajaMensualById(id, tenantId);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    // Escritura: sólo administradores autenticados, acotados a su propio tenant.
    router.post(
      this.BASE_URL,
      authMiddleware,
      requireRole(['admin']),
      tenantScopeMiddleware,
      validateBody(createCajaMensualSchema),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const result = await this.controller.createCajaMensual(req.body, req.tenantId);
          res.status(201).json({ status: 'success', data: result });
        } catch (error) {
          next(error);
        }
      }
    );

    router.post(`${this.BASE_URL}recomendar`, validateBody(recommendCajaMensualSchema), async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { suscriptorId, preferencias, apiKey } = req.body;
        const result = await this.controller.recommendCajaMensual(suscriptorId, preferencias, apiKey);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.post(
      `${this.BASE_URL}recomendar-general`,
      authMiddleware,
      requireRole(['admin']),
      tenantScopeMiddleware,
      validateBody(recommendCajaMensualGeneralSchema),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { apiKey } = req.body;
          const result = await this.controller.recommendCajaMensualGeneral(req.tenantId, apiKey);
          res.status(200).json({ status: 'success', data: result });
        } catch (error) {
          next(error);
        }
      }
    );

    router.put(
      `${this.BASE_URL}:id`,
      authMiddleware,
      requireRole(['admin']),
      tenantScopeMiddleware,
      validateParams(cajaMensualIdParamSchema),
      validateBody(updateCajaMensualSchema),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { id } = req.params;
          const result = await this.controller.updateCajaMensual(id, req.body, req.tenantId);
          res.status(200).json({ status: 'success', data: result });
        } catch (error) {
          next(error);
        }
      }
    );

    router.delete(
      `${this.BASE_URL}:id`,
      authMiddleware,
      requireRole(['admin']),
      tenantScopeMiddleware,
      validateParams(cajaMensualIdParamSchema),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { id } = req.params;
          const result = await this.controller.deleteCajaMensual(id, req.tenantId);
          res.status(200).json({ status: 'success', data: result });
        } catch (error) {
          next(error);
        }
      }
    );

    return router;
  }
}

export default new CajasMensualesRouter().getRouter();
