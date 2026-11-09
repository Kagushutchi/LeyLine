import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

/**
 * Middleware de Aislamiento de Inquilino (Multi-Tenancy)
 * Asegura que las operaciones de un administrador de bodega operen estrictamente dentro del ámbito de su tenantId.
 */
export const tenantScopeMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.user?.role === 'admin') {
    if (!req.user.tenantId) {
      throw new AppError('El administrador no tiene una bodega asignada', 400);
    }
    req.tenantId = req.user.tenantId;
  }
  next();
};

