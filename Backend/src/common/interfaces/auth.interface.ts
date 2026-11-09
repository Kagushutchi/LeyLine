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
  // Augmentación del tipo Request de Express: es la forma idiomática de TypeORM/Express
  // para extender tipos de terceros, de ahí la excepción puntual a la regla de ESLint.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: string;
    }
  }
}

