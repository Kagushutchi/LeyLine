import { Router, Request, Response } from "express";
import SuscriptoresController from "./controller";

class SuscriptoresRouter
{
    private router: Router;
    private controller: SuscriptoresController; 
    private BASE_URL = '/'

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

        router.get(this.BASE_URL, async (req: Request, res: Response) => {
            const result = await this.controller.getSuscriptores();
            res.send(result);
        });
        
        router.get(`${this.BASE_URL}/:id`, async (req: Request, res: Response) => {
            const { id } = req.params;
            const result = await this.controller.getSuscriptorById(id);
            res.send(result);
        });

        router.post(this.BASE_URL, async (req: Request, res: Response) => {
            const result = await this.controller.createSuscriptor(req.body);
            res.send(result);
        });
        
        router.put(`${this.BASE_URL}/:id`, async (req: Request, res: Response) => {
            const { id } = req.params;
            const result = await this.controller.updateSuscriptor(id, req.body);
            res.send(result);
        });
        
        router.delete(`${this.BASE_URL}/:id`, async (req: Request, res: Response) => {
            const { id } = req.params;
            const result = await this.controller.deleteSuscriptor(id);
            res.send(result);
        }); 

        return router;
    }
}

export default new SuscriptoresRouter().getRouter();