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
        let result: Suscriptor;

        try
        {
            result = await this.repository.delete(id);
        }
        catch
        {
            throw new AppError('Cliente no encontrado', 404);
        }

        return { success: result, id };
    }
}
