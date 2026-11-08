import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { JwtUtils } from '../utils/jwt';

/**
 * Middleware de Autenticación JWT
 * Valida el token Bearer en el header Authorization, decodifica el payload y lo inyecta en req.user
 */
export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Token de autenticación no proporcionado', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = JwtUtils.verifyAccessToken(token);
    req.user = payload;
    if (payload.tenantId) {
      req.tenantId = payload.tenantId;
    }
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('El token de acceso ha expirado', 401);
    }
    throw new AppError('Token de autenticación inválido', 401);
  }
};

/**
 * Middleware opcional de autenticación (no lanza error si no hay token, pero lo inyecta si está presente)
 */
export const optionalAuthMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = JwtUtils.verifyAccessToken(token);
    req.user = payload;
    if (payload.tenantId) {
      req.tenantId = payload.tenantId;
    }
  } catch {
    // Si falla la verificación opcional, simplemente continuamos como anónimo
  }
  next();
};

