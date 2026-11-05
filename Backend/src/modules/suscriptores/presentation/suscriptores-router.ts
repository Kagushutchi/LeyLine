import { Router, Request, Response, NextFunction } from "express";
import SuscriptoresController from "./controller";
import { validateBody, validateParams } from "../../../common/middlewares/validation.middleware";
import { createSuscriptorSchema, updateSuscriptorSchema, suscriptorIdParamSchema } from "./suscriptor.schema";

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

        router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
            try {
                const result = await this.controller.getSuscriptores();
                res.status(200).json({ status: 'success', data: result });
            } catch (error) {
                next(error);
            }
        });
        
        router.get('/:id', validateParams(suscriptorIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
            try {
                const result = await this.controller.getSuscriptorById(req.params.id);
                res.status(200).json({ status: 'success', data: result });
            } catch (error) {
                next(error);
            }
        });

        router.post('/', validateBody(createSuscriptorSchema), async (req: Request, res: Response, next: NextFunction) => {
            try {
                const result = await this.controller.createSuscriptor(req.body);
                res.status(201).json({ status: 'success', data: result });
            } catch (error) {
                next(error);
            }
        });
        
        router.put('/:id', validateParams(suscriptorIdParamSchema), validateBody(updateSuscriptorSchema), async (req: Request, res: Response, next: NextFunction) => {
            try {
                const result = await this.controller.updateSuscriptor(req.params.id, req.body);
                res.status(200).json({ status: 'success', data: result });
            } catch (error) {
                next(error);
            }
        });
        
        router.delete('/:id', validateParams(suscriptorIdParamSchema), async (req: Request, res: Response, next: NextFunction) => {
            try {
                const result = await this.controller.deleteSuscriptor(req.params.id);
                res.status(200).json({ status: 'success', data: result });
            } catch (error) {
                next(error);
            }
        }); 

        return router;
    }
}

export default new SuscriptoresRouter().getRouter();
