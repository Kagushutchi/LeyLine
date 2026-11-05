import { Request, Response, NextFunction } from 'express';
import { QueryFailedError } from 'typeorm';
import { AppError } from '../errors/app-error';
import { logger } from '../utils/logger';

export const errorHandlerMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = res.locals.requestId as string | undefined;
  logger.error(`[${requestId ?? '-'}] Error no controlado: ${err.message}`, err.stack);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  if (err instanceof QueryFailedError) {
    const driverError = (err as QueryFailedError & { driverError?: { code?: string; message?: string } }).driverError;
    const code = driverError?.code;
    const dbMessage = String(driverError?.message ?? err.message);

    const isForeignKey = code === '23503' || /FOREIGN KEY constraint failed/i.test(dbMessage);
    if (isForeignKey) {
      res.status(409).json({
        status: 'error',
        message: 'No se puede completar la operación porque el registro está relacionado con otros datos.',
      });
      return;
    }

    const isUnique = code === '23505' || /UNIQUE constraint failed/i.test(dbMessage);
    if (isUnique) {
      res.status(409).json({
        status: 'error',
        message: 'Ya existe un registro con esos datos únicos (email, SKU, etc.).',
      });
      return;
    }
  }

  res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor',
  });
};
