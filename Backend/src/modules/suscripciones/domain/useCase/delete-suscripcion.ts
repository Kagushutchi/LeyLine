import { SuscripcionRepository } from "../../infrastructure/suscripcion-repository";
import { AppError } from "../../../../common/errors/app-error";
import { assertTenantOwnership } from "../../../../common/utils/tenant-ownership";

export default class DeleteSuscripcion {
  private repository: SuscripcionRepository;

  constructor() {
    this.repository = new SuscripcionRepository();
  }

  async execute(id: string | number, tenantId?: string): Promise<any> {
    const existing = await this.repository.findOneById(id);
    if (!existing) {
      throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    }
    assertTenantOwnership(existing.tenantId, tenantId);
    const result = await this.repository.delete(id);
    return { success: result, id };
  }
}
