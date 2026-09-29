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

    async execute(payload: Partial<Suscriptor>): Promise<Suscriptor>
    {
        if (!payload.nombre?.trim())
        {
            throw new AppError('El nombre es requerido para registrar un cliente', 400);
        }

        if (!payload.email?.trim())
        {
            throw new AppError('El email es requerido para registrar un cliente', 400);
        }

        if (!/^\S+@\S+\.\S+$/.test(payload.email))
        {
            throw new AppError('El email no tiene un formato válido', 400);
        }
        
        return await this.repository.save({
            ...payload,
            nombre: payload.nombre.trim(),
            email: payload.email.trim().toLowerCase(),
        } as Suscriptor);
    }
}
