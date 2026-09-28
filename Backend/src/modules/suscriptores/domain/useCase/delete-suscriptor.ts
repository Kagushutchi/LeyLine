import { Suscriptor } from "../../infrastructure/suscriptor.entity";;
import { IBaseRepository } from "../../../../common/interfaces/base-repository.interface";
import { SuscriptorRepository } from "../../infrastructure/suscriptor-repository";

export default class DeleteSuscriptor
{
    private repository: IBaseRepository<Suscriptor>;

    constructor()
    {
        this.repository = new SuscriptorRepository();
    }
    async execute(id: string | number): Promise<any>
    {
        const result = await this.repository.delete(id);
        return { success: result, id };
    }
}