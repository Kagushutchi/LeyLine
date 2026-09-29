import { Router, Request, Response, NextFunction } from "express";
import SuscriptoresController from "./controller";

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
        
        router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
            try {
                const result = await this.controller.getSuscriptorById(req.params.id);
                res.status(200).json({ status: 'success', data: result });
            } catch (error) {
                next(error);
            }
        });

        router.post('/', async (req: Request, res: Response, next: NextFunction) => {
            try {
                const result = await this.controller.createSuscriptor(req.body);
                res.status(201).json({ status: 'success', data: result });
            } catch (error) {
                next(error);
            }
        });
        
        router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
            try {
                const result = await this.controller.updateSuscriptor(req.params.id, req.body);
                res.status(200).json({ status: 'success', data: result });
            } catch (error) {
                next(error);
            }
        });
        
        router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
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
