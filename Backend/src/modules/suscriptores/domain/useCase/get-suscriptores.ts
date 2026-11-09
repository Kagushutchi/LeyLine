import { Suscriptor } from "../../infrastructure/suscriptor.entity";
import { SuscriptorRepository } from "../../infrastructure/suscriptor-repository";

export default class GetSuscriptores
{
    private repository: SuscriptorRepository;
    constructor()
    {
        this.repository = new SuscriptorRepository();
    }

    async execute(tenantId?: string): Promise<Suscriptor[]>
    {
        return await this.repository.findAll(tenantId);
    }
}