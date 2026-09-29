import { NextFunction, Request, Response, Router } from 'express';
import ProductosController from './controller';

class ProductosRouter {
  private readonly controller = new ProductosController();
  private readonly router = Router();

  constructor() {
    this.router.get('/', this.handle(async () => this.controller.getAll()));
    this.router.get('/:id', this.handle(async (req) => this.controller.getById(req.params.id)));
    this.router.post('/', this.handle(async (req) => this.controller.create(req.body), 201));
    this.router.put('/:id', this.handle(async (req) => this.controller.update(req.params.id, req.body)));
    this.router.delete('/:id', this.handle(async (req) => this.controller.delete(req.params.id)));
  }

  private handle(action: (req: Request) => Promise<unknown>, status = 200) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try { res.status(status).json({ status: 'success', data: await action(req) }); }
      catch (error) { next(error); }
    };
  }

  getRouter() { return this.router; }
}

export default new ProductosRouter().getRouter();
