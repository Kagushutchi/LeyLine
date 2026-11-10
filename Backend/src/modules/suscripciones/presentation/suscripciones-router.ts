import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../../common/middlewares/auth.middleware";
import { AppError } from "../../../common/errors/app-error";
import { getDataSource } from "../../../config/database.config";
import { User } from "../../auth/infrastructure/user.entity";
import { CajaMensualRepository } from "../../cajas-mensuales/infrastructure/caja-mensual-repository";
import SuscripcionesController from "./controller";
import { validateBody, validateParams } from "../../../common/middlewares/validation.middleware";
import { envConfig } from "../../../config/env.config";
import { updateSuscripcionSchema, suscripcionIdParamSchema, suscriptorIdParamSchema } from "./suscripcion.schema";

/**
 * Rutas heredadas (síncronas). Todas exigen autenticación y quedan aisladas por
 * tenant (admin) o por suscriptor vinculado de forma confiable (subscriptor).
 * El flujo con colas vive en /api/solicitudes-suscripcion.
 */
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

  /** Suscriptor vinculado al usuario autenticado (nunca inferido por email). */
  private async linkedSuscriptorId(req: Request): Promise<string> {
    const user = await getDataSource().getRepository(User).findOneBy({ id: req.user!.userId });
    if (!user || !user.activo || !user.suscriptorId) {
      throw new AppError('No existe un suscriptor vinculado', 403);
    }
    return user.suscriptorId;
  }

  private adminTenant(req: Request): string {
    const tenantId = req.user!.tenantId;
    if (!tenantId) throw new AppError('Usuario sin tenant asignado', 403);
    return tenantId;
  }

  /** Tenant passed to the use cases (assertTenantOwnership) when the caller is an admin. */
  private tenantOf(req: Request): string | undefined {
    return req.user!.role === 'admin' ? this.adminTenant(req) : undefined;
  }

  private requireAdmin(req: Request): string {
    if (req.user!.role !== 'admin') throw new AppError('Acción no permitida', 403);
    return this.adminTenant(req);
  }

  /** Carga la suscripción y verifica que el solicitante pueda operar sobre ella. */
  private async authorizedSuscripcion(req: Request, id: string, allowOwner: boolean): Promise<any> {
    const suscripcion = await this.controller.getSuscripcionById(id);
    if (req.user!.role === 'admin') {
      if (suscripcion.tenantId !== this.adminTenant(req)) throw new AppError('Suscripción no encontrada', 404);
      return suscripcion;
    }
    if (allowOwner && req.user!.role === 'subscriptor') {
      if (suscripcion.suscriptorId !== await this.linkedSuscriptorId(req)) throw new AppError('Suscripción no encontrada', 404);
      return suscripcion;
    }
    throw new AppError('Acción no permitida', 403);
  }

  public createRouter(): Router {
    const router = Router();
    router.use(authMiddleware);

    const wrap = (handler: (req: Request, res: Response) => Promise<void>) =>
      (req: Request, res: Response, next: NextFunction) => { handler(req, res).catch(next); };

    router.get(this.BASE_URL, wrap(async (req, res) => {
      let tenantId: string | undefined;
      let suscriptorId: string | undefined;
      if (req.user!.role === 'admin') tenantId = this.adminTenant(req);
      else suscriptorId = await this.linkedSuscriptorId(req);
      const result = await this.controller.getSuscripciones(tenantId, suscriptorId);
      res.status(200).json({ status: 'success', data: result });
    }));

    const bySuscriptor = wrap(async (req, res) => {
      const requested = req.params.suscriptorId;
      if (req.user!.role === 'admin') {
        const tenantId = this.adminTenant(req);
        const all = await this.controller.getSuscripcionesBySuscriptor(requested);
        res.status(200).json({ status: 'success', data: all.filter((s: any) => s.tenantId === tenantId) });
        return;
      }
      if (requested !== await this.linkedSuscriptorId(req)) throw new AppError('Acción no permitida', 403);
      const result = await this.controller.getSuscripcionesBySuscriptor(requested);
      res.status(200).json({ status: 'success', data: result });
    });
    router.get(`${this.BASE_URL}cliente/:suscriptorId`, validateParams(suscriptorIdParamSchema), bySuscriptor);
    router.get(`${this.BASE_URL}suscriptor/:suscriptorId`, validateParams(suscriptorIdParamSchema), bySuscriptor);

    router.get(`${this.BASE_URL}:id`, validateParams(suscripcionIdParamSchema), wrap(async (req, res) => {
      const result = await this.authorizedSuscripcion(req, req.params.id, true);
      res.status(200).json({ status: 'success', data: result });
    }));

    router.post(this.BASE_URL, wrap(async (req, res) => {
      const body = req.body ?? {};
      if (typeof body.cajaMensualId !== 'string') throw new AppError('cajaMensualId es requerido', 400);
      const caja = await new CajaMensualRepository().findOneById(body.cajaMensualId);
      if (!caja) throw new AppError('Caja mensual no encontrada', 404);

      let payload: any;
      if (req.user!.role === 'admin') {
        // El tenant sale del token y la caja debe pertenecerle.
        const tenantId = this.adminTenant(req);
        if (caja.tenantId !== tenantId) throw new AppError('Caja mensual no encontrada', 404);
        payload = { ...body, tenantId };
      } else {
        // Con pagos habilitados el alta del suscriptor pasa por la solicitud (checkout): este camino crearía la
        // membresía activa sin cobrar. Queda sólo para altas administrativas.
        if (envConfig.payments.provider !== 'none') {
          throw new AppError('Para suscribirte usá una solicitud de suscripción (incluye el pago)', 403);
        }
        // Suscriptor: solo para sí mismo, con tenant y precio tomados de la caja.
        payload = {
          cajaMensualId: caja.id, suscriptorId: await this.linkedSuscriptorId(req),
          tenantId: caja.tenantId, montoMensual: caja.precioBase,
        };
      }
      const result = await this.controller.createSuscripcion(payload, payload.tenantId);
      res.status(201).json({ status: 'success', data: result });
    }));

    const pause = wrap(async (req, res) => {
      await this.authorizedSuscripcion(req, req.params.id, true);
      res.status(200).json({ status: 'success', data: await this.controller.pauseSuscripcion(req.params.id, this.tenantOf(req)) });
    });
    const resume = wrap(async (req, res) => {
      await this.authorizedSuscripcion(req, req.params.id, true);
      res.status(200).json({ status: 'success', data: await this.controller.resumeSuscripcion(req.params.id, this.tenantOf(req)) });
    });
    const portal = wrap(async (req, res) => {
      await this.authorizedSuscripcion(req, req.params.id, true);
      res.status(200).json({ status: 'success', data: await this.controller.billingPortal(req.params.id, this.tenantOf(req)) });
    });
    router.post(`${this.BASE_URL}:id/portal`, validateParams(suscripcionIdParamSchema), portal);
    const cancel = wrap(async (req, res) => {
      await this.authorizedSuscripcion(req, req.params.id, true);
      res.status(200).json({ status: 'success', data: await this.controller.cancelSuscripcion(req.params.id, this.tenantOf(req)) });
    });
    router.put(`${this.BASE_URL}:id/pausar`, validateParams(suscripcionIdParamSchema), pause);
    router.patch(`${this.BASE_URL}:id/pausar`, validateParams(suscripcionIdParamSchema), pause);
    router.put(`${this.BASE_URL}:id/reanudar`, validateParams(suscripcionIdParamSchema), resume);
    router.patch(`${this.BASE_URL}:id/reanudar`, validateParams(suscripcionIdParamSchema), resume);
    router.put(`${this.BASE_URL}:id/cancelar`, validateParams(suscripcionIdParamSchema), cancel);
    router.patch(`${this.BASE_URL}:id/cancelar`, validateParams(suscripcionIdParamSchema), cancel);

    router.put(`${this.BASE_URL}:id`, validateParams(suscripcionIdParamSchema), validateBody(updateSuscripcionSchema), wrap(async (req, res) => {
      this.requireAdmin(req);
      await this.authorizedSuscripcion(req, req.params.id, false);
      const { tenantId: _t, suscriptorId: _s, ...changes } = req.body ?? {};
      res.status(200).json({ status: 'success', data: await this.controller.updateSuscripcion(req.params.id, changes, this.tenantOf(req)) });
    }));

    router.delete(`${this.BASE_URL}:id`, validateParams(suscripcionIdParamSchema), wrap(async (req, res) => {
      this.requireAdmin(req);
      await this.authorizedSuscripcion(req, req.params.id, false);
      res.status(200).json({ status: 'success', data: await this.controller.deleteSuscripcion(req.params.id, this.tenantOf(req)) });
    }));

    return router;
  }
}

export default new SuscripcionesRouter().getRouter();
