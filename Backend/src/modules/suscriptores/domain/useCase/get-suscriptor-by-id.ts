import { IBaseRepository } from "../../../../common/interfaces/base-repository.interface";
import { Suscriptor } from "../../infrastructure/suscriptor.entity";
import { SuscriptorRepository } from "../../infrastructure/suscriptor-repository";

export class GetSuscriptorById
{
    private repository: IBaseRepository<Suscriptor>;
    constructor()
    {
        this.repository = new SuscriptorRepository();
    }
    
    async execute(id: string | number): Promise<any>
    {
        return await this.repository.findOneById(id);
    }
}