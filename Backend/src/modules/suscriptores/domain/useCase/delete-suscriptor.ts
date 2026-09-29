import { Suscriptor } from "../../infrastructure/suscriptor.entity";;
import { IBaseRepository } from "../../../../common/interfaces/base-repository.interface";
import { SuscriptorRepository } from "../../infrastructure/suscriptor-repository";
import { AppError } from "../../../../common/errors/app-error";

export default class DeleteSuscriptor
{
    private repository: IBaseRepository<Suscriptor>;

    constructor()
    {
        this.repository = new SuscriptorRepository();
    }

    async execute(id: string | number): Promise<any>
    {
        const current = await this.repository.findOneById(id);
        if (!current)
        {
            throw new AppError('Cliente no encontrado', 404);
        }

        const result = await this.repository.delete(id);
        return { success: result, id };
    }
}
