import { Suscriptor } from "../../infrastructure/suscriptor.entity";
import { SuscriptorRepository } from "../../infrastructure/suscriptor-repository";
import { AppError } from "../../../../common/errors/app-error";

export class GetSuscriptorById
{
    private repository: SuscriptorRepository;
    constructor()
    {
        this.repository = new SuscriptorRepository();
    }
    
    async execute(id: string | number, tenantId?: string): Promise<Suscriptor>
    {
        const suscriptor = await this.repository.findOneById(id, tenantId);

        if (!suscriptor)
        {
            throw new AppError('Cliente no encontrado', 404);
        }

        return suscriptor;
    }
}
