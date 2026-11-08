import GetCurrentUser from '../domain/useCase/get-current-user';
import Login from '../domain/useCase/login';
import Logout from '../domain/useCase/logout';
import RefreshToken from '../domain/useCase/refresh-token';
import RegisterAdmin from '../domain/useCase/register-admin';
import RegisterSubscriptor from '../domain/useCase/register-subscriptor';

export default class AuthController {
  async registerAdmin(payload: any) {
    return new RegisterAdmin().execute(payload);
  }

  async registerSubscriptor(payload: any) {
    return new RegisterSubscriptor().execute(payload);
  }

  async login(payload: any) {
    return new Login().execute(payload);
  }

  async refreshToken(refreshToken: string) {
    return new RefreshToken().execute(refreshToken);
  }

  async logout(userId: string) {
    return new Logout().execute(userId);
  }

  async me(userId: string) {
    return new GetCurrentUser().execute(userId);
  }
}

