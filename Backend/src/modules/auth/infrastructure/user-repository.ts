import { DataSource } from 'typeorm';
import { getDataSource } from '../../../config/database.config';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { User } from './user.entity';

export class UserRepository extends BaseTypeORM<User> {
  constructor(private readonly db: DataSource = getDataSource()) {
    super(db.getRepository(User));
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.getRepository(User).findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['tenant'],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.db.getRepository(User).findOne({
      where: { username: username.toLowerCase().trim() },
      relations: ['tenant'],
    });
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    const cleanId = identifier.toLowerCase().trim();
    return this.db
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .where('LOWER(user.email) = :cleanId OR LOWER(user.username) = :cleanId', {
        cleanId,
      })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async findWithTenant(id: string): Promise<User | null> {
    return this.db.getRepository(User).findOne({
      where: { id },
      relations: ['tenant'],
    });
  }

  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    await this.db.getRepository(User).update(id, { refreshToken });
  }
}

