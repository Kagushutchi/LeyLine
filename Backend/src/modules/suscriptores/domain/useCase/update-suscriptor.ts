import { IBaseRepository } from "../../../../common/interfaces/base-repository.interface";
import { Suscriptor } from "../../infrastructure/suscriptor.entity";
import { SuscriptorRepository } from "../../infrastructure/suscriptor-repository";
import { AppError } from "../../../../common/errors/app-error";

export default class UpdateSuscriptor
{
    private repository: IBaseRepository<Suscriptor>;
    constructor()
    {
        this.repository = new SuscriptorRepository();
    }

    async execute(id: string | number, payload: Partial<Suscriptor>): Promise<Suscriptor>
    {
        const current = await this.repository.findOneById(id);

        if (!current)
        {
            throw new AppError('Cliente no encontrado', 404);
        }

        if (payload.nombre !== undefined && !payload.nombre.trim())
        {
            throw new AppError('El nombre no puede estar vacío', 400);
        }

        if (payload.email !== undefined && !/^\S+@\S+\.\S+$/.test(payload.email.trim()))
        {
            throw new AppError('El email no tiene un formato válido', 400);
        }

        const updated = await this.repository.update(id, {
            ...payload,
            ...(payload.nombre !== undefined ? { nombre: payload.nombre.trim() } : {}),
            ...(payload.email !== undefined ? { email: payload.email.trim().toLowerCase() } : {}),
        });

        if (!updated)
        {
            throw new AppError('No se pudo actualizar el cliente', 500);
        }

        return updated;
    }
}
