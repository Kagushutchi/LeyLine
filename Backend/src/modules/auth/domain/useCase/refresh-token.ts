import { AppError } from '../../../../common/errors/app-error';
import { JwtUtils } from '../../../../common/utils/jwt';
import { UserRepository } from '../../infrastructure/user-repository';

export default class RefreshToken {
  constructor(private readonly userRepo = new UserRepository()) {}

  async execute(refreshToken: string) {
    if (!refreshToken) {
      throw new AppError('Refresh token no proporcionado', 400);
    }

    let payload;
    try {
      payload = JwtUtils.verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Refresh token inválido o expirado', 401);
    }

    const user = await this.userRepo.findWithTenant(payload.userId);
    if (!user || !user.activo) {
      throw new AppError('Usuario no encontrado o inactivo', 401);
    }

    if (user.refreshToken !== refreshToken) {
      throw new AppError('Refresh token revocado o sesión expirada', 401);
    }

    const newPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      suscriptorId: user.suscriptorId || null,
      nombre: user.nombre,
      apellido: user.apellido,
    };

    const newAccessToken = JwtUtils.generateAccessToken(newPayload);
    const newRefreshToken = JwtUtils.generateRefreshToken(newPayload);

    await this.userRepo.updateRefreshToken(user.id, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}

