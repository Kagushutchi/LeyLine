import { Router, Request, Response, NextFunction } from "express";
import CajasMensualesController from "./controller";

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

    router.get(this.BASE_URL, async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.controller.getCajasMensuales();
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.get(`${this.BASE_URL}periodo/:anio/:mes`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const anio = parseInt(req.params.anio, 10);
        const mes = parseInt(req.params.mes, 10);
        const result = await this.controller.getCajasByMesAnio(mes, anio);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.get(`${this.BASE_URL}:id`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.getCajaMensualById(id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.post(this.BASE_URL, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.controller.createCajaMensual(req.body);
        res.status(201).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.post(`${this.BASE_URL}recomendar`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { suscriptorId, preferencias } = req.body;
        const result = await this.controller.recommendCajaMensual(suscriptorId, preferencias);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.put(`${this.BASE_URL}:id`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.updateCajaMensual(id, req.body);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    router.delete(`${this.BASE_URL}:id`, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await this.controller.deleteCajaMensual(id);
        res.status(200).json({ status: 'success', data: result });
      } catch (error) {
        next(error);
      }
    });

    return router;
  }
}

export default new CajasMensualesRouter().getRouter();
