import { AppError } from '../../../../common/errors/app-error';
import { JwtUtils } from '../../../../common/utils/jwt';
import { TenantRepository } from '../../infrastructure/tenant-repository';
import { UserRepository } from '../../infrastructure/user-repository';

export interface RegisterAdminDTO {
  nombreNegocio: string;
  email: string;
  password: string;
  username: string;
}

export default class RegisterAdmin {
  constructor(
    private readonly userRepo = new UserRepository(),
    private readonly tenantRepo = new TenantRepository()
  ) {}

  async execute(dto: RegisterAdminDTO) {
    const { nombreNegocio, email, password, username } = dto;

    if (!nombreNegocio || !email || !password || !username) {
      throw new AppError(
        'Todos los campos son obligatorios: nombre del negocio, correo, contraseña y nombre de usuario',
        400
      );
    }

    if (password.length < 6) {
      throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim();

    const existingEmail = await this.userRepo.findByEmail(cleanEmail);
    if (existingEmail) {
      throw new AppError('El correo electrónico ya está registrado', 409);
    }

    const existingUsername = await this.userRepo.findByUsername(cleanUsername);
    if (existingUsername) {
      throw new AppError('El nombre de usuario ya está en uso', 409);
    }

    // Generar slug a partir del nombre del negocio
    let baseSlug = nombreNegocio
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!baseSlug) baseSlug = 'bodega';
    let slug = baseSlug;
    let counter = 1;
    while (await this.tenantRepo.findBySlug(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    // 1. Crear el Tenant (Bodega)
    const tenant = await this.tenantRepo.save({
      nombre: nombreNegocio.trim(),
      slug,
      plan: 'artesanal',
      activo: true,
    } as any);

    // 2. Hash de contraseña y crear Usuario Administrador
    const hashedPassword = await JwtUtils.hashPassword(password);
    const user = await this.userRepo.save({
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      role: 'admin',
      tenantId: tenant.id,
      activo: true,
    } as any);

    // 3. Generar tokens (Access y Refresh)
    const jwtPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,
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
        tenantId: tenant.id,
        tenant: {
          id: tenant.id,
          nombre: tenant.nombre,
          slug: tenant.slug,
          plan: tenant.plan,
        },
      },
      accessToken,
      refreshToken,
    };
  }
}

