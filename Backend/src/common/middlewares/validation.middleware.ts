import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

/**
 * Componente de Utilidad: Validación
 * Middleware genérico para aplicar esquemas o validaciones a peticiones entrantes.
 */
export type ValidationSchema<T> = (data: unknown) => { isValid: boolean; errors?: string[]; value?: T };

export const validateBody = <T>(validator: ValidationSchema<T>) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = validator(req.body);
    if (!result.isValid) {
      const errorMsg = result.errors ? result.errors.join(', ') : 'Cuerpo de la petición inválido';
      next(new AppError(`Error de validación: ${errorMsg}`, 400));
      return;
    }
    next();
  };
};
