import { UserRepository } from '../../infrastructure/user-repository';

export default class Logout {
  constructor(private readonly userRepo = new UserRepository()) {}

  async execute(userId: string) {
    if (userId) {
      await this.userRepo.updateRefreshToken(userId, null);
    }
    return { success: true };
  }
}

