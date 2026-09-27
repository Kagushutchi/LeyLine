import { Request, Response, NextFunction } from 'express';
import { CajaMensualService } from './caja-mensual.service';

/**
 * Capa de Presentación: CajaMensualController
 * Maneja las peticiones HTTP entrantes para el recurso Cajas Mensuales (Productos).
 */
export class CajaMensualController {
  constructor(private readonly cajaMensualService: CajaMensualService) {}

  public getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await this.cajaMensualService.listarCajas();
      res.status(200).json({ status: 'success', data: items });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const item = await this.cajaMensualService.obtenerPorId(req.params.id);
      res.status(200).json({ status: 'success', data: item });
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const nuevo = await this.cajaMensualService.crearCaja(req.body);
      res.status(201).json({ status: 'success', data: nuevo });
    } catch (error) {
      next(error);
    }
  };

  public recommend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const recomendacion = await this.cajaMensualService.armarCajaPersonalizada(
        req.body.suscriptorId,
        req.body.preferencias
      );
      res.status(200).json({ status: 'success', data: recomendacion });
    } catch (error) {
      next(error);
    }
  };
}
