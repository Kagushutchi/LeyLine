import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { UserRole } from '../interfaces/auth.interface';

/**
 * Middleware de Control de Acceso Basado en Roles (RBAC)
 * Restringe el acceso exclusivamente a los roles permitidos.
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Usuario no autenticado', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        `Acceso no autorizado: se requiere uno de los roles [${allowedRoles.join(', ')}]`,
        403
      );
    }

    next();
  };
};

