import { SuscriptorRepository } from "../../infrastructure/suscriptor-repository";
import { AppError } from "../../../../common/errors/app-error";
import { assertTenantOwnership } from "../../../../common/utils/tenant-ownership";

export default class DeleteSuscriptor
{
    private repository: SuscriptorRepository;

    constructor()
    {
        this.repository = new SuscriptorRepository();
    }

    async execute(id: string | number, tenantId?: string): Promise<any>
    {
        const current = await this.repository.findOneById(id, tenantId);
        if (!current)
        {
            throw new AppError('Cliente no encontrado', 404);
        }

        assertTenantOwnership(current.tenantId, tenantId);

        const result = await this.repository.delete(id);
        return { success: result, id };
    }
}
