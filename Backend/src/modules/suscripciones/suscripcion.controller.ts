import { Request, Response, NextFunction } from 'express';
import { SuscripcionService } from './suscripcion.service';

/**
 * Capa de Presentación: SuscripcionController
 * Maneja las peticiones HTTP entrantes para el recurso Suscripciones (Pedidos).
 */
export class SuscripcionController {
  constructor(private readonly suscripcionService: SuscripcionService) {}

  public getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const list = await this.suscripcionService.listarSuscripciones();
      res.status(200).json({ status: 'success', data: list });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const item = await this.suscripcionService.obtenerPorId(req.params.id);
      res.status(200).json({ status: 'success', data: item });
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const nuevo = await this.suscripcionService.crearSuscripcion(req.body);
      res.status(201).json({ status: 'success', data: nuevo });
    } catch (error) {
      next(error);
    }
  };

  public pause = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.suscripcionService.pausarSuscripcion(req.params.id);
      res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
      next(error);
    }
  };

  public cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.suscripcionService.cancelarSuscripcion(req.params.id);
      res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
      next(error);
    }
  };
}
