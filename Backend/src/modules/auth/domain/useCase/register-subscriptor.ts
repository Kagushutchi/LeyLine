import { AppError } from '../../../../common/errors/app-error';
import { JwtUtils } from '../../../../common/utils/jwt';
import { UserRepository } from '../../infrastructure/user-repository';
import { SuscriptorRepository } from '../../../suscriptores/infrastructure/suscriptor-repository';

export interface RegisterSubscriptorDTO {
  email: string;
  username: string;
  nombre: string;
  apellido: string;
  password: string;
}

export default class RegisterSubscriptor {
  constructor(
    private readonly userRepo = new UserRepository(),
    private readonly suscriptorRepo = new SuscriptorRepository()
  ) {}

  async execute(dto: RegisterSubscriptorDTO) {
    const { email, username, nombre, apellido, password } = dto;

    if (!email || !username || !nombre || !apellido || !password) {
      throw new AppError(
        'Todos los campos son obligatorios: correo, nombre de usuario, nombre, apellido y contraseña',
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

    // 1. Hash de contraseña y crear Usuario Subscriptor
    const hashedPassword = await JwtUtils.hashPassword(password);
    const user = await this.userRepo.save({
      username: cleanUsername,
      email: cleanEmail,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      password: hashedPassword,
      role: 'subscriptor',
      activo: true,
    } as any);

    // 2. Crear registro de Suscriptor de dominio si aún no existe para este correo
    const allSuscriptores = await this.suscriptorRepo.findAll();
    const existingSuscriptor = allSuscriptores.find(
      (s) => s.email?.toLowerCase() === cleanEmail
    );

    if (!existingSuscriptor) {
      await this.suscriptorRepo.save({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: cleanEmail,
        activo: true,
        preferenciasOrganolepticas: {
          categoria: 'vinos',
          perfilSabor: [],
          intensidad: 'media',
          alergiasRestricciones: [],
          notasAdicionales: '',
        },
      } as any);
    }

    // 3. Generar tokens (Access y Refresh)
    const jwtPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
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
      },
      accessToken,
      refreshToken,
    };
  }
}

