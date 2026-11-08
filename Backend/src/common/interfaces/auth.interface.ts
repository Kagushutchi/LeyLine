export type UserRole = 'admin' | 'subscriptor';

export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  nombre?: string;
  apellido?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: string;
    }
  }
}

