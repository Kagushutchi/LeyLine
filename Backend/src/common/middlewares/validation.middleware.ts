import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { AppError } from '../errors/app-error';

const formatIssues = (error: ZodError): string => {
  return error.issues
    .map((issue) => {
      const path = issue.path.map(String).join('.');
      return `${path || 'body'}: ${issue.message}`;
    })
    .join('; ');
};

/**
 * Componente de Utilidad: Validación
 * Valida el cuerpo de la petición contra un esquema Zod y reemplaza `req.body`
 * por los datos ya normalizados/parseados.
 */
export const validateBody = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new AppError(`Error de validación: ${formatIssues(result.error)}`, 400));
      return;
    }
    req.body = result.data;
    next();
  };
};

/**
 * Valida los parámetros de ruta (por ejemplo un UUID) contra un esquema Zod.
 */
export const validateParams = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(new AppError(`Parámetros inválidos: ${formatIssues(result.error)}`, 400));
      return;
    }
    next();
  };
};
