import { AppError } from '../../../../common/errors/app-error';
import { UserRepository } from '../../infrastructure/user-repository';

export default class GetCurrentUser {
  constructor(private readonly userRepo = new UserRepository()) {}

  async execute(userId: string) {
    const user = await this.userRepo.findWithTenant(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      nombre: user.nombre,
      apellido: user.apellido,
      tenantId: user.tenantId,
      suscriptorId: user.suscriptorId || null,
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            nombre: user.tenant.nombre,
            slug: user.tenant.slug,
            plan: user.tenant.plan,
          }
        : null,
      createdAt: user.createdAt,
    };
  }
}

