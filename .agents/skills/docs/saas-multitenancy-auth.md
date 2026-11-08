saas-multitenancy-auth
Implementa autenticación multi-tenancy, gestión de roles (Admin de Bodega vs Subscriptor) y aislamiento de datos para el SaaS ClubCurator. Use when adding multi-tenant auth, role-based access control (RBAC), or tenant middleware in Express and TypeORM.

Instructions
Multi-Tenancy Authentication & RBAC Skill for ClubCurator
Summary
Guía técnica y patrones de implementación para el sistema de autenticación multi-tenancy y control de acceso basado en roles (RBAC) en el monolito modular de ClubCurator.

When to Use
Cuando necesites implementar autenticación basada en JWT con soporte multi-tenant.
Al configurar control de acceso por roles (admin de bodega vs subscriptor).
Al aislar consultas de base de datos por tenantId en repositorios TypeORM.
Al crear middlewares de seguridad y autorización en Express.
1. Arquitectura de Inquilinos y Roles
Tipos de Usuario (Roles)
admin (Administrador de Inquilino / Bodega):
Dueño o gestor de una bodega, tostadero o marca artesanal específica.
Permisos: CRUD completo sobre sus propios productos, cajas mensuales, gestión de suscripciones de su bodega y visualización de suscriptores asociados.
subscriptor (Cliente / Consumidor Final):
Usuario del club de membresía.
Permisos: Lectura de cajas disponibles, gestión de sus propias preferencias organolépticas, y visualización/actualización de su única suscripción personal.
Modelo de Datos (Esquema Multi-Tenant)
Cada entidad clave debe incorporar una referencia al inquilino (tenantId o bodegaId) para garantizar el aislamiento de datos:

Usuarios / Credenciales: id, email, passwordHash, role (admin | subscriptor), tenantId (nullable para subscriptores globales o vinculado al inquilino).
Entidades de Dominio (productos, cajas_mensuales, suscripciones): Deben incluir tenantId para filtrar consultas a nivel de repositorio.
2. Implementación de Middlewares de Seguridad
A. Autenticación JWT (auth.middleware.ts)
Valida el token Bearer en el header Authorization, decodifica el payload y lo inyecta en req.user:

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'admin' | 'subscriptor';
  tenantId?: string;
}
B. Control de Roles (roles.middleware.ts)
Restringe el acceso según el rol del usuario:

export const requireRole = (allowedRoles: ('admin' | 'subscriptor')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new AppError('Acceso no autorizado para este rol', 403);
    }
    next();
  };
};
C. Aislamiento por Tenant (tenant.middleware.ts)
Asegura que las peticiones de un admin de bodega operen exclusivamente dentro del scope de su tenantId:

export const tenantScopeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === 'admin' && req.user.tenantId) {
    req.tenantId = req.user.tenantId;
  }
  next();
};
3. Filtrado en Repositorios TypeORM
En los repositorios específicos (ej. CajaMensualRepository), inyectar el filtro por tenantId cuando el usuario es administrador de inquilino:

async findByTenant(tenantId: string): Promise<CajaMensual[]> {
  return this.repository.find({ where: { tenantId } });
}
4. Gotchas & Best Practices
Nunca confíes en el tenantId enviado por el cliente en el body/query: Inyéctalo siempre desde el token JWT validado (req.user.tenantId).
Aislamiento estricto: Los subscriptores no deben tener tenantId obligatorio estricto si acceden a un catálogo global, pero sus suscripciones y preferencias son estrictamente privadas.
Separación de rutas: Mantén rutas de administración (/api/admin/...) separadas de las rutas de cliente (/api/client/...) para clarificar el middleware de autorización aplicado.