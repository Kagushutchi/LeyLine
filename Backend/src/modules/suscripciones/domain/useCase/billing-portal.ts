import { SuscripcionRepository } from "../../infrastructure/suscripcion-repository";
import { AppError } from "../../../../common/errors/app-error";
import { assertTenantOwnership } from "../../../../common/utils/tenant-ownership";
import { IPaymentStrategy } from "../../../../common/patterns/strategies/payment-strategy.interface";
import { createPaymentStrategy } from "../../../../common/patterns/strategies/payment-strategy.registry";
import { envConfig } from "../../../../config/env.config";

/** Devuelve la URL del portal del proveedor donde el cliente actualiza su tarjeta y consulta sus facturas. */
export default class BillingPortal {
  private repository = new SuscripcionRepository();

  constructor(private readonly payments: IPaymentStrategy | null = createPaymentStrategy()) {}

  async execute(id: string | number, tenantId?: string): Promise<{ url: string }> {
    const suscripcion = await this.repository.findOneById(id);
    if (!suscripcion) throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    assertTenantOwnership(suscripcion.tenantId, tenantId);
    if (!suscripcion.providerSubscriptionId) throw new AppError('Esta suscripción no tiene un medio de pago asociado', 400);
    if (!this.payments || this.payments.providerName !== suscripcion.paymentProvider) {
      throw new AppError('El proveedor de pago de esta suscripción no está disponible', 503);
    }
    try {
      return { url: await this.payments.createBillingPortalSession(suscripcion.providerSubscriptionId, envConfig.payments.portalReturnUrl) };
    } catch {
      throw new AppError('No se pudo abrir el portal de pagos', 502);
    }
  }
}
