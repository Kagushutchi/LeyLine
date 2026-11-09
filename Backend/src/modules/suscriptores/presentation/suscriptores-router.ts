import { Router, Request, Response, NextFunction } from "express";
import SuscriptoresController from "./controller";
import { validateBody, validateParams } from "../../../common/middlewares/validation.middleware";
import { createSuscriptorSchema, updateSuscriptorSchema, suscriptorIdParamSchema } from "./suscriptor.schema";
import { authMiddleware, optionalAuthMiddleware } from "../../../common/middlewares/auth.middleware";
import { requireRole } from "../../../common/middlewares/roles.middleware";
import { tenantScopeMiddleware } from "../../../common/middlewares/tenant.middleware";

class SuscriptoresRouter
{
    private router: Router;
    private controller: SuscriptoresController;

    constructor()
    {
        this.controller = new SuscriptoresController();
        this.router = this.createRouter();
    }

    public getRouter()
    {
        return this.router;
    }

    public createRouter()
    {
        const router = Router();

        router.get('/', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
            try {
                const tenantId = req.user?.role === 'admin' ? req.user.tenantId : undefined;
                const result = await this.controller.getSuscriptores(tenantId);
                res.status(200).json({ status: 'success', data: result });
            } catch (error) {
                next(error);
            }
        });

        router.get('/:id', optionalAuthMiddleware, validateParams(suscriptorIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
            try {
                const tenantId = req.user?.role === 'admin' ? req.user.tenantId : undefined;
                const result = await this.controller.getSuscriptorById(req.params.id, tenantId);
                res.status(200).json({ status: 'success', data: result });
            } catch (error) {
                next(error);
            }
        });

        router.post(
            '/',
            authMiddleware,
            requireRole(['admin']),
            tenantScopeMiddleware,
            validateBody(createSuscriptorSchema),
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const result = await this.controller.createSuscriptor(req.body, req.tenantId);
                    res.status(201).json({ status: 'success', data: result });
                } catch (error) {
                    next(error);
                }
            }
        );

        router.put(
            '/:id',
            authMiddleware,
            requireRole(['admin']),
            tenantScopeMiddleware,
            validateParams(suscriptorIdParamSchema),
            validateBody(updateSuscriptorSchema),
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const result = await this.controller.updateSuscriptor(req.params.id, req.body, req.tenantId);
                    res.status(200).json({ status: 'success', data: result });
                } catch (error) {
                    next(error);
                }
            }
        );

        router.delete(
            '/:id',
            authMiddleware,
            requireRole(['admin']),
            tenantScopeMiddleware,
            validateParams(suscriptorIdParamSchema),
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    const result = await this.controller.deleteSuscriptor(req.params.id, req.tenantId);
                    res.status(200).json({ status: 'success', data: result });
                } catch (error) {
                    next(error);
                }
            }
        );

        return router;
    }
}

export default new SuscriptoresRouter().getRouter();
