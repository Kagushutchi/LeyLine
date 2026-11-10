import { randomUUID } from 'crypto';
import { DataSource, QueryFailedError } from 'typeorm';
import { IPaymentStrategy } from '../../../common/patterns/strategies/payment-strategy.interface';
import { CajaMensual } from '../../cajas-mensuales/infrastructure/caja-mensual.entity';
import { PlanPago } from '../infrastructure/plan-pago.entity';

/**
 * Devuelve el plan recurrente del proveedor para una caja y un precio, creándolo una sola vez.
 * Los precios de los proveedores son inmutables: un cambio de precio produce un plan nuevo.
 */
export async function ensurePlan(
  db: DataSource,
  strategy: IPaymentStrategy,
  input: { box: CajaMensual; amountCents: number; currency: string },
): Promise<string> {
  const repository = db.getRepository(PlanPago);
  const key = { provider: strategy.providerName, cajaMensualId: input.box.id, amountCents: input.amountCents, currency: input.currency };
  const cached = await repository.findOneBy(key);
  if (cached) return cached.providerPlanId;

  const providerPlanId = await strategy.createSubscriptionPlan({
    planKey: `caja:${input.box.id}:${input.amountCents}:${input.currency}`,
    name: input.box.nombre, amountCents: input.amountCents, currency: input.currency, intervalMonths: 1,
  });
  try {
    await repository.insert({ id: randomUUID(), ...key, providerPlanId });
  } catch (error) {
    // Otro worker lo creó en paralelo: se reutiliza el ganador (el proveedor es idempotente por planKey).
    if (!(error instanceof QueryFailedError)) throw error;
    const winner = await repository.findOneBy(key);
    if (!winner) throw error;
    return winner.providerPlanId;
  }
  return providerPlanId;
}
