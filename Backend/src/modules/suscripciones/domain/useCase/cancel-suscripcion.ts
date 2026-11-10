import { Suscripcion } from "../../infrastructure/suscripcion.entity";
import { SuscripcionRepository } from "../../infrastructure/suscripcion-repository";
import { AppError } from "../../../../common/errors/app-error";
import { assertTenantOwnership } from "../../../../common/utils/tenant-ownership";
import { IPaymentStrategy } from "../../../../common/patterns/strategies/payment-strategy.interface";
import { createPaymentStrategy } from "../../../../common/patterns/strategies/payment-strategy.registry";
import { syncWithProvider } from "../provider-sync";

export default class CancelSuscripcion {
  private repository: SuscripcionRepository;

  constructor(private readonly payments: IPaymentStrategy | null = createPaymentStrategy()) {
    this.repository = new SuscripcionRepository();
  }

  async execute(id: string | number, tenantId?: string): Promise<Suscripcion> {
    const suscripcion = await this.repository.findOneById(id);
    if (!suscripcion) {
      throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    }
    assertTenantOwnership(suscripcion.tenantId, tenantId);
    if (suscripcion.estado === 'cancelada') {
      throw new AppError('La suscripción ya se encuentra cancelada', 400);
    }

    // Primero el proveedor: si no puede cancelar, no marcamos como cancelada una suscripción que se seguiría cobrando.
    await syncWithProvider(suscripcion, this.payments, 'cancelSubscription');

    const updated = await this.repository.update(id, { estado: 'cancelada' });
    if (!updated) throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    return updated;
  }
}
