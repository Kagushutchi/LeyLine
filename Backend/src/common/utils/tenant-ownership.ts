import { AppError } from '../errors/app-error';

/**
 * Componente de Utilidad: Verificación de propiedad multi-tenant.
 *
 * Se usa en las operaciones de escritura (update/delete) de los módulos de dominio
 * para asegurar que un administrador autenticado sólo modifique registros de su
 * propio tenant. Un registro sin tenantId se considera del catálogo compartido y
 * puede ser editado por cualquier administrador (compatibilidad con datos sembrados
 * antes de la multi-tenancy).
 */
export const assertTenantOwnership = (
  recordTenantId: string | null | undefined,
  requestTenantId: string | undefined
): void => {
  if (!requestTenantId) {
    // No hay contexto de tenant (ruta pública o usuario no-admin): no se restringe aquí,
    // la autorización de acceso a la ruta ya la resuelven authMiddleware/requireRole.
    return;
  }

  if (recordTenantId && recordTenantId !== requestTenantId) {
    throw new AppError('No tenés permisos para modificar un registro de otra bodega/tostadero', 403);
  }
};
