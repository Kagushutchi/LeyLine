import { Router, Request, Response, NextFunction } from "express";
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

    router.get(this.BASE_URL, async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.controller.getSuscripciones();
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

    router.get(`${this.BASE_URL}:id`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.getSuscripcionById(id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.post(this.BASE_URL, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.controller.createSuscripcion(req.body);
        res.status(201).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.put(`${this.BASE_URL}:id/pausar`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.pauseSuscripcion(id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.patch(`${this.BASE_URL}:id/pausar`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.pauseSuscripcion(id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.put(`${this.BASE_URL}:id/cancelar`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.cancelSuscripcion(id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.patch(`${this.BASE_URL}:id/cancelar`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.cancelSuscripcion(id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.put(`${this.BASE_URL}:id`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.updateSuscripcion(id, req.body);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.delete(`${this.BASE_URL}:id`, async (req: Request, res: Response, next: NextFunction) => {
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
