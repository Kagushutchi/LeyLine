import { AppError } from '../../../common/errors/app-error';
import { IPaymentStrategy } from '../../../common/patterns/strategies/payment-strategy.interface';
import { Suscripcion } from '../infrastructure/suscripcion.entity';

type ProviderAction = 'pauseSubscription' | 'resumeSubscription' | 'cancelSubscription';

const failures: Record<ProviderAction, string> = {
  pauseSubscription: 'No se pudo pausar la suscripción en el proveedor de pago',
  resumeSubscription: 'No se pudo reanudar la suscripción en el proveedor de pago',
  cancelSubscription: 'No se pudo cancelar la suscripción en el proveedor de pago',
};

/**
 * Aplica el cambio en el proveedor de pago ANTES de tocar la base: si el proveedor falla, el estado local no cambia
 * y no queda una suscripción "pausada" que igual se sigue cobrando (o "activa" que ya no se cobra).
 * Las suscripciones sin proveedor (altas administrativas) sólo cambian en la base.
 */
export async function syncWithProvider(
  suscripcion: Suscripcion,
  payments: IPaymentStrategy | null,
  action: ProviderAction,
): Promise<void> {
  if (!suscripcion.providerSubscriptionId) return;
  if (!payments || payments.providerName !== suscripcion.paymentProvider) {
    throw new AppError('El proveedor de pago de esta suscripción no está disponible', 503);
  }
  try {
    await payments[action](suscripcion.providerSubscriptionId);
  } catch {
    throw new AppError(failures[action], 502);
  }
}
