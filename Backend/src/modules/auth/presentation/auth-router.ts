import { NextFunction, Request, Response, Router } from 'express';
import { authMiddleware } from '../../../common/middlewares/auth.middleware';
import AuthController from './controller';

class AuthRouter {
  private readonly controller = new AuthController();
  private readonly router = Router();

  constructor() {
    this.router.post(
      '/register-admin',
      this.handle((req) => this.controller.registerAdmin(req.body), 201)
    );

    this.router.post(
      '/register-subscriptor',
      this.handle((req) => this.controller.registerSubscriptor(req.body), 201)
    );

    this.router.post(
      '/login',
      this.handle((req) => this.controller.login(req.body), 200)
    );

    this.router.post(
      '/refresh',
      this.handle((req) => this.controller.refreshToken(req.body.refreshToken), 200)
    );

    this.router.post(
      '/logout',
      authMiddleware,
      this.handle((req) => this.controller.logout(req.user!.userId), 200)
    );

    this.router.get(
      '/me',
      authMiddleware,
      this.handle((req) => this.controller.me(req.user!.userId), 200)
    );
  }

  private handle(action: (req: Request) => Promise<unknown>, status = 200) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const data = await action(req);
        res.status(status).json({ status: 'success', data });
      } catch (error) {
        next(error);
      }
    };
  }

  getRouter() {
    return this.router;
  }
}

export default new AuthRouter().getRouter();

