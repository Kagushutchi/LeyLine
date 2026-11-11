import { AppError } from '../../../../common/errors/app-error';
import { JwtUtils } from '../../../../common/utils/jwt';
import { UserRepository } from '../../infrastructure/user-repository';

export interface LoginDTO {
  identifier?: string;
  email?: string;
  username?: string;
  password?: string;
}

export default class Login {
  constructor(private readonly userRepo = new UserRepository()) {}

  async execute(dto: LoginDTO) {
    const rawIdentifier = dto.identifier || dto.email || dto.username;
    const { password } = dto;

    if (!rawIdentifier || !password) {
      throw new AppError('Debe ingresar usuario o correo y contraseña', 400);
    }

    const user = await this.userRepo.findByIdentifier(rawIdentifier);
    if (!user) {
      throw new AppError('Credenciales inválidas', 401);
    }

    if (!user.activo) {
      throw new AppError('Esta cuenta se encuentra inactiva o suspendida', 403);
    }

    const isMatch = await JwtUtils.comparePassword(password, user.password);
    if (!isMatch) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const jwtPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      suscriptorId: user.suscriptorId || null,
      nombre: user.nombre,
      apellido: user.apellido,
    };

    const accessToken = JwtUtils.generateAccessToken(jwtPayload);
    const refreshToken = JwtUtils.generateRefreshToken(jwtPayload);

    await this.userRepo.updateRefreshToken(user.id, refreshToken);

    return {
      user: {
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
      },
      accessToken,
      refreshToken,
    };
  }
}

