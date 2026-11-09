import { AppError } from '../../../../common/errors/app-error';
import { JwtUtils } from '../../../../common/utils/jwt';
import { DataSource } from 'typeorm';
import { getDataSource } from '../../../../config/database.config';
import { User } from '../../infrastructure/user.entity';
import { Suscriptor } from '../../../suscriptores/infrastructure/suscriptor.entity';

export interface RegisterSubscriptorDTO {
  email: string;
  username: string;
  nombre: string;
  apellido: string;
  password: string;
}

export default class RegisterSubscriptor {
  constructor(private readonly db: DataSource = getDataSource()) {}

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

    const hashedPassword = await JwtUtils.hashPassword(password);
    return this.db.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const subscribers = manager.getRepository(Suscriptor);
      // Include deleted records: their unique email/username remains reserved.
      if (await users.findOne({ where: { email: cleanEmail }, withDeleted: true })) {
        throw new AppError('El correo electrónico ya está registrado', 409);
      }
      if (await users.findOne({ where: { username: cleanUsername }, withDeleted: true })) {
        throw new AppError('El nombre de usuario ya está en uso', 409);
      }
      const existingSubscriber = await subscribers.createQueryBuilder('subscriber')
        .withDeleted()
        .where('LOWER(subscriber.email) = :email', { email: cleanEmail })
        .getOne();
      if (existingSubscriber) {
        throw new AppError('No se puede completar el registro con este correo', 409);
      }

      const subscriber = await subscribers.save({
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
      });
      const user = await users.save({
        username: cleanUsername,
        email: cleanEmail,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        password: hashedPassword,
        role: 'subscriptor',
        activo: true,
        suscriptorId: subscriber.id,
      });

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

      await users.update(user.id, { refreshToken });

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
    });
  }
}

