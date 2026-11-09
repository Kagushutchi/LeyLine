import { getDataSource } from '../../../config/database.config';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { User } from './user.entity';

export class UserRepository extends BaseTypeORM<User> {
  constructor() {
    super(getDataSource().getRepository(User));
  }

  async findByEmail(email: string): Promise<User | null> {
    return getDataSource().getRepository(User).findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['tenant'],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return getDataSource().getRepository(User).findOne({
      where: { username: username.toLowerCase().trim() },
      relations: ['tenant'],
    });
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    const cleanId = identifier.toLowerCase().trim();
    return getDataSource()
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .where('LOWER(user.email) = :cleanId OR LOWER(user.username) = :cleanId', {
        cleanId,
      })
      .getOne();
  }

  async findWithTenant(id: string): Promise<User | null> {
    return getDataSource().getRepository(User).findOne({
      where: { id },
      relations: ['tenant'],
    });
  }

  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    await getDataSource().getRepository(User).update(id, { refreshToken });
  }
}
