import { IBaseRepository } from "../../../../common/interfaces/base-repository.interface";
import { Suscriptor } from "../../infrastructure/suscriptor.entity";
import { SuscriptorRepository } from "../../infrastructure/suscriptor-repository";
import { AppError } from "../../../../common/errors/app-error";

export default class CreateSuscriptor
{
    private repository: IBaseRepository<Suscriptor>;

    constructor()
    {
        this.repository = new SuscriptorRepository();
    }

    async execute(payload: Suscriptor): Promise<any>
    {
        if (!payload.email) 
        {
            throw new AppError('El email es requerido para registrar un suscriptor', 400);
        }
        
        return await this.repository.save(payload);
    }
}