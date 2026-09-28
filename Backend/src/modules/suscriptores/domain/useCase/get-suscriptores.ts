import { IBaseRepository } from "../../../../common/interfaces/base-repository.interface";
import { Suscriptor } from "../../infrastructure/suscriptor.entity";
import { SuscriptorRepository } from "../../infrastructure/suscriptor-repository";

export default class GetSuscriptores
{
    private repository: IBaseRepository<Suscriptor>;
    constructor()
    {
        this.repository = new SuscriptorRepository();
    }

    async execute(): Promise<any[]>
    {
        return await this.repository.findAll();
    }
}