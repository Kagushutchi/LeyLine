import { envConfig } from '../../../config/env.config';
import { FakePaymentStrategy } from './fake-payment.strategy';
import { IPaymentStrategy } from './payment-strategy.interface';
import { StripePaymentStrategy } from './stripe-payment.strategy';

type PaymentConfig = typeof envConfig.payments;

/**
 * Registro de estrategias de pago (selección por configuración, en el estilo de DatabaseFactory).
 * Para sumar un proveedor: implementar `IPaymentStrategy` y agregar una línea acá.
 */
const builders: Record<string, (config: PaymentConfig) => IPaymentStrategy> = {
  fake: (config) => new FakePaymentStrategy(config.fakeWebhookSecret),
  stripe: (config) => new StripePaymentStrategy(config.stripe.secretKey, config.stripe.webhookSecret),
};

/** Devuelve la estrategia configurada, o `null` si los pagos están deshabilitados (`PAYMENT_PROVIDER=none`). */
export function createPaymentStrategy(config: PaymentConfig = envConfig.payments): IPaymentStrategy | null {
  if (config.provider === 'none') return null;
  const build = builders[config.provider];
  if (!build) throw new Error(`PAYMENT_PROVIDER inválido: ${config.provider}`);
  return build(config);
}
