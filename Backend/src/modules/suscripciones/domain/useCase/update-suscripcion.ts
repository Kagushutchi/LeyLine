import { Suscripcion } from "../../infrastructure/suscripcion.entity";
import { SuscripcionRepository } from "../../infrastructure/suscripcion-repository";
import { AppError } from "../../../../common/errors/app-error";
import { assertTenantOwnership } from "../../../../common/utils/tenant-ownership";

export default class UpdateSuscripcion {
  private repository: SuscripcionRepository;

  constructor() {
    this.repository = new SuscripcionRepository();
  }

  async execute(id: string | number, payload: Partial<Suscripcion>, tenantId?: string): Promise<Suscripcion> {
    const existing = await this.repository.findOneById(id);
    if (!existing) {
      throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    }
    assertTenantOwnership(existing.tenantId, tenantId);

    const updated = await this.repository.update(id, payload);
    if (!updated) throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    return updated;
  }
}
