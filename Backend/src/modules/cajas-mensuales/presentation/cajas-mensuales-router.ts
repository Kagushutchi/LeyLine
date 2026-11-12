import { Router, Request, Response, NextFunction } from "express";
import CajasMensualesController from "./controller";
import { validateBody, validateParams } from "../../../common/middlewares/validation.middleware";
import {
  createCajaMensualSchema,
  updateCajaMensualSchema,
  recommendCajaMensualSchema,
  recommendCajasExistentesSchema,
  cajaMensualIdParamSchema,
  periodoParamSchema,
} from "./caja-mensual.schema";
import { authMiddleware, optionalAuthMiddleware } from "../../../common/middlewares/auth.middleware";
import { requireRole } from "../../../common/middlewares/roles.middleware";
import { tenantScopeMiddleware } from "../../../common/middlewares/tenant.middleware";
import { AppError } from "../../../common/errors/app-error";
import { getDataSource } from "../../../config/database.config";
import { User } from "../../auth/infrastructure/user.entity";

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

  private async linkedSuscriptorId(req: Request): Promise<string> {
    const user = await getDataSource().getRepository(User).findOneBy({ id: req.user!.userId });
    if (!user || !user.activo || !user.suscriptorId) {
      throw new AppError('No existe un suscriptor vinculado', 403);
    }
    return user.suscriptorId;
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
        const { suscriptorId, preferencias } = req.body;
        const result = await this.controller.recommendCajaMensual(suscriptorId, preferencias);
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
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const result = await this.controller.recommendCajaMensualGeneral(req.tenantId);
          res.status(200).json({ status: 'success', data: result });
        } catch (error) {
          next(error);
        }
      }
    );

    router.post(
      `${this.BASE_URL}recomendar-existentes`,
      authMiddleware,
      validateBody(recommendCajasExistentesSchema),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          let suscriptorId = req.body.suscriptorId;
          if (req.user!.role === 'subscriptor') {
            suscriptorId = await this.linkedSuscriptorId(req);
          } else if (!suscriptorId) {
            throw new AppError('suscriptorId es requerido para recomendar cajas existentes', 400);
          }
          const result = await this.controller.recommendCajasExistentes(suscriptorId);
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
