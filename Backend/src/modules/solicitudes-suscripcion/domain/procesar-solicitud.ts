import { randomUUID } from 'crypto';
import { DataSource, In } from 'typeorm';
import { DeliveryOutcome, MessageEnvelope } from '../../../common/messaging/message-transport';
import { User } from '../../auth/infrastructure/user.entity';
import { Suscriptor } from '../../suscriptores/infrastructure/suscriptor.entity';
import { CajaMensual } from '../../cajas-mensuales/infrastructure/caja-mensual.entity';
import { Suscripcion } from '../../suscripciones/infrastructure/suscripcion.entity';
import { SolicitudSuscripcion } from '../infrastructure/solicitud.entity';
import { MensajeInbox } from '../infrastructure/inbox.entity';
import { MensajeOutbox } from '../infrastructure/outbox.entity';
import { centavos } from './aceptar-solicitud';
import { defaultRetryPolicy, RetryPolicy, scheduleRetry } from '../infrastructure/retry-reconciler';
import { serializeSqlite } from './sqlite-serialization';
import { IPaymentStrategy } from '../../../common/patterns/strategies/payment-strategy.interface';
import { ensurePlan } from '../../pagos/domain/plan-catalog';
import { convertAmount } from '../../pagos/domain/currency-converter';
import { ClientePago } from '../../pagos/infrastructure/cliente-pago.entity';

const consumer = 'subscription-request-v1';
const terminalStates = ['completado', 'rechazado', 'fallido', 'expirado'];

/** Configuración del cobro: si está presente, la suscripción se activa recién cuando el proveedor confirma el pago. */
export interface PaymentFlow {
  strategy: IPaymentStrategy;
  /** Moneda de los precios de las cajas y moneda en la que cobra el proveedor. */
  baseCurrency: string;
  currency: string;
  /** Unidades de moneda base por 1 unidad de moneda de cobro; obligatorio si las monedas difieren. */
  fxRate: number | null;
  successUrl: string;
  cancelUrl: string;
  checkoutTtlMinutes?: number;
}

/** Internal handler: application startup must not subscribe until rollout policies are ready. */
export class ProcesarSolicitud {
  constructor(
    private readonly db: DataSource,
    private readonly retryPolicy: RetryPolicy = defaultRetryPolicy,
    private readonly payments: PaymentFlow | null = null,
  ) {
    if (!Number.isInteger(retryPolicy.maxAttempts) || retryPolicy.maxAttempts < 1 || retryPolicy.retryDelayMs < 0 || retryPolicy.staleAfterMs <= 0) {
      throw new Error('Invalid retry policy');
    }
  }

  async execute(message: MessageEnvelope): Promise<DeliveryOutcome> {
    if (!message || message.type !== 'subscription.requested' || message.version !== 1 ||
      typeof message.messageId !== 'string' || !message.messageId ||
      typeof message.requestId !== 'string' || !message.requestId ||
      typeof message.tenantId !== 'string' || !message.tenantId) return 'reject';
    const attempt = (message.payload && typeof message.payload === 'object' ? (message.payload as { attempt?: unknown }).attempt : undefined) ?? 0;
    if (!Number.isSafeInteger(attempt) || (attempt as number) < 0) return 'reject';

    try {
      const outcome = await serializeSqlite(this.db, () => this.db.transaction(async (manager): Promise<DeliveryOutcome | 'start-payment'> => {
        const requests = manager.getRepository(SolicitudSuscripcion);
        const outbox = await manager.getRepository(MensajeOutbox).findOneBy({ id: message.messageId, solicitudId: message.requestId });
        if (!outbox || outbox.tipo !== message.type || outbox.version !== message.version) return 'reject';
        const request = await requests.findOneBy({ id: message.requestId });
        if (!request || request.tenantId !== message.tenantId) return 'reject';
        if ((attempt as number) < request.intentosProcesamiento || terminalStates.includes(request.estado)) return 'ack';
        if ((attempt as number) > request.intentosProcesamiento) return 'reject';
        const inbox = manager.getRepository(MensajeInbox);
        if (await inbox.findOneBy({ consumer, messageId: message.messageId })) return 'ack';

        // Conditional write serializes competing deliveries of the same request.
        const claim = await requests.createQueryBuilder().update(SolicitudSuscripcion)
          .set({ estado: 'procesando' }).where('id = :id AND estado = :state AND intentosProcesamiento = :attempt', { id: request.id, state: 'pendiente', attempt }).execute();
        if (claim.affected !== 1) {
          const current = await requests.findOneBy({ id: request.id });
          return current && (current.intentosProcesamiento > (attempt as number) || terminalStates.includes(current.estado)) ? 'ack' : 'retry';
        }

        const principal = await manager.getRepository(User).findOneBy({ id: request.principalId });
        const subscriber = await manager.getRepository(Suscriptor).findOneBy({ id: request.suscriptorId });
        const box = await manager.getRepository(CajaMensual).findOneBy({ id: request.cajaMensualId });
        const valid = principal?.activo && principal.role === 'subscriptor' && principal.suscriptorId === request.suscriptorId &&
          subscriber?.activo && box?.disponible && box.tenantId === request.tenantId && centavos(request.precioConfirmado) !== null;
        const duplicate = valid && await manager.getRepository(Suscripcion).findOne({ where: {
          suscriptorId: request.suscriptorId, cajaMensualId: request.cajaMensualId, estado: In(['activa', 'pausada']),
        } });
        if (!valid || !box || duplicate) {
          await requests.update(request.id, { estado: 'rechazado' });
          await inbox.insert({ id: randomUUID(), consumer, messageId: message.messageId });
          return 'ack';
        }

        // Con pagos habilitados el claim ('procesando') queda confirmado y el cobro se inicia fuera de la transacción.
        if (this.payments) return 'start-payment';

        const now = new Date();
        const subscription = await manager.getRepository(Suscripcion).save({
          suscriptorId: request.suscriptorId, cajaMensualId: request.cajaMensualId,
          tenantId: request.tenantId, categoria: box.categoria, montoMensual: Number(request.precioConfirmado),
          estado: 'activa', fechaInicio: now, proximoCobro: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        });
        await requests.update(request.id, { estado: 'completado', suscripcionId: subscription.id });
        await inbox.insert({ id: randomUUID(), consumer, messageId: message.messageId });
        return 'ack';
      }));
      if (outcome !== 'start-payment') return outcome;
      try {
        return await this.startPayment(message, attempt as number);
      } catch (error) {
        // Devuelve la solicitud a 'pendiente' para que el reintento durable pueda reclamarla de nuevo.
        await serializeSqlite(this.db, () => this.db.getRepository(SolicitudSuscripcion).update(
          { id: message.requestId, estado: 'procesando', intentosProcesamiento: attempt as number }, { estado: 'pendiente' }));
        throw error;
      }
    } catch {
      // Failure rolls back the business transaction. Ack only after a durable retry is scheduled.
      try {
        const result = await serializeSqlite(this.db, () => scheduleRetry(this.db, message.requestId, message.messageId, attempt as number, this.retryPolicy, undefined, message.tenantId));
        return result === 'exhausted' ? 'reject' : 'ack';
      } catch {
        // A DLQ delivery can be recovered later by the reconciler once the database is available.
        return 'retry';
      }
    }
  }
  /**
   * Inicia el checkout en el proveedor (llamada de red fuera de cualquier transacción).
   * La idempotency key es el id de la solicitud: reintentar no duplica el checkout.
   */
  private async startPayment(message: MessageEnvelope, attempt: number): Promise<DeliveryOutcome> {
    const { strategy, baseCurrency, currency, fxRate, successUrl, cancelUrl, checkoutTtlMinutes } = this.payments!;
    const request = await this.db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: message.requestId });
    const box = await this.db.getRepository(CajaMensual).findOneByOrFail({ id: request.cajaMensualId });
    const subscriber = await this.db.getRepository(Suscriptor).findOneByOrFail({ id: request.suscriptorId });
    const amountCents = centavos(request.precioConfirmado)!;

    // Los precios están en moneda base (p. ej. pesos); el proveedor cobra en `currency` al tipo de cambio configurado.
    const charge = convertAmount(amountCents, baseCurrency, currency, fxRate);
    const providerPlanId = await ensurePlan(this.db, strategy, { box, amountCents: charge.amountCents, currency: charge.to });
    const known = await this.db.getRepository(ClientePago).findOneBy({ provider: strategy.providerName, suscriptorId: request.suscriptorId });
    const started = await strategy.startSubscription({
      providerPlanId, idempotencyKey: `subscription-request-${request.id}`, solicitudId: request.id,
      tenantId: request.tenantId, providerCustomerId: known?.providerCustomerId, customerEmail: subscriber.email, successUrl, cancelUrl, expiresInMinutes: checkoutTtlMinutes,
    });

    return serializeSqlite(this.db, () => this.db.transaction(async (manager): Promise<DeliveryOutcome> => {
      const updated = await manager.getRepository(SolicitudSuscripcion).update(
        { id: request.id, estado: 'procesando', intentosProcesamiento: attempt },
        {
          estado: 'esperando_pago', paymentProvider: strategy.providerName, providerSessionId: started.providerSessionId, checkoutUrl: started.checkoutUrl,
          chargeAmountCents: charge.amountCents, chargeCurrency: charge.to, fxRate: String(charge.rate),
        });
      if (updated.affected !== 1) return 'ack';
      await manager.getRepository(MensajeInbox).insert({ id: randomUUID(), consumer, messageId: message.messageId });
      return 'ack';
    }));
  }
}
