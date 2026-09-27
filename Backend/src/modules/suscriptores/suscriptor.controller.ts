import { Request, Response, NextFunction } from 'express';
import { SuscriptorService } from './suscriptor.service';

/**
 * Capa de Presentación: SuscriptorController
 * Maneja las peticiones HTTP entrantes para el recurso Suscriptores.
 */
export class SuscriptorController {
  constructor(private readonly suscriptorService: SuscriptorService) {}

  public getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const suscriptores = await this.suscriptorService.listarSuscriptores();
      res.status(200).json({ status: 'success', data: suscriptores });
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const suscriptor = await this.suscriptorService.obtenerPorId(req.params.id);
      res.status(200).json({ status: 'success', data: suscriptor });
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const nuevo = await this.suscriptorService.registrarSuscriptor(req.body);
      res.status(201).json({ status: 'success', data: nuevo });
    } catch (error) {
      next(error);
    }
  };

  public updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await this.suscriptorService.actualizarPreferenciasOrganolepticas(
        req.params.id,
        req.body
      );
      res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
      next(error);
    }
  };
}
