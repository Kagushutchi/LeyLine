import { Suscripcion } from "../../infrastructure/suscripcion.entity";
import { SuscripcionRepository } from "../../infrastructure/suscripcion-repository";
import { AppError } from "../../../../common/errors/app-error";
import { assertTenantOwnership } from "../../../../common/utils/tenant-ownership";
import { IPaymentStrategy } from "../../../../common/patterns/strategies/payment-strategy.interface";
import { createPaymentStrategy } from "../../../../common/patterns/strategies/payment-strategy.registry";
import { syncWithProvider } from "../provider-sync";

export default class PauseSuscripcion {
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
    if (suscripcion.estado !== 'activa') {
      throw new AppError(`Solo se pueden pausar suscripciones activas (estado actual: ${suscripcion.estado})`, 400);
    }

    await syncWithProvider(suscripcion, this.payments, 'pauseSubscription');

    const updated = await this.repository.update(id, { estado: 'pausada', pausadaPorPago: false });
    if (!updated) throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    return updated;
  }
}
