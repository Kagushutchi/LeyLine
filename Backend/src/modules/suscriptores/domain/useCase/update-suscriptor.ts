import { IBaseRepository } from "../../../../common/interfaces/base-repository.interface";
import { Suscriptor } from "../../infrastructure/suscriptor.entity";
import { SuscriptorRepository } from "../../infrastructure/suscriptor-repository";

export default class UpdateSuscriptor
{
    private repository: IBaseRepository<Suscriptor>;
    constructor()
    {
        this.repository = new SuscriptorRepository();
    }

    async execute(id: string | number, payload: any): Promise<any>
    {
        // Implement the update logic here using the id and payload
        return await this.repository.update(id, payload);
    }
}