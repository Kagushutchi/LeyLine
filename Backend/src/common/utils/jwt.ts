import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { envConfig } from '../../config/env.config';
import { JwtPayload } from '../interfaces/auth.interface';

const SALT_ROUNDS = 10;

/**
 * Utilidades criptográficas y de gestión de JSON Web Tokens
 */
export class JwtUtils {
  public static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, envConfig.jwt.secret, {
      expiresIn: envConfig.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  public static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, envConfig.jwt.refreshSecret, {
      expiresIn: envConfig.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  public static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, envConfig.jwt.secret) as JwtPayload;
  }

  public static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, envConfig.jwt.refreshSecret) as JwtPayload;
  }

  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

