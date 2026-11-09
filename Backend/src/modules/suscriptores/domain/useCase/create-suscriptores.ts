import { Suscriptor } from "../../infrastructure/suscriptor.entity";
import { SuscriptorRepository } from "../../infrastructure/suscriptor-repository";
import { AppError } from "../../../../common/errors/app-error";

export default class CreateSuscriptor
{
    private repository: SuscriptorRepository;

    constructor()
    {
        this.repository = new SuscriptorRepository();
    }

    async execute(payload: Partial<Suscriptor>, tenantId?: string): Promise<Suscriptor>
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
        // The tenant always comes from the authenticated caller, never from the body.
        const { id: _id, deletedAt: _deletedAt, tenantId: _tenantId, ...changes } = payload;
        return await this.repository.save({
            ...changes,
            nombre: payload.nombre.trim(),
            email: payload.email.trim().toLowerCase(),
            ...(tenantId ? { tenantId } : {}),
        } as Suscriptor);
    }
}
