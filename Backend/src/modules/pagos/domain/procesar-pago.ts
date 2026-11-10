import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { DeliveryOutcome, MessageEnvelope } from '../../../common/messaging/message-transport';
import { PaymentEvent } from '../../../common/patterns/strategies/payment-strategy.interface';
import { logger } from '../../../common/utils/logger';
import { CajaMensual } from '../../cajas-mensuales/infrastructure/caja-mensual.entity';
import { Suscripcion } from '../../suscripciones/infrastructure/suscripcion.entity';
import { MensajeInbox } from '../../solicitudes-suscripcion/infrastructure/inbox.entity';
import { MensajeOutbox } from '../../solicitudes-suscripcion/infrastructure/outbox.entity';
import { SolicitudSuscripcion } from '../../solicitudes-suscripcion/infrastructure/solicitud.entity';
import { serializeSqlite } from '../../solicitudes-suscripcion/domain/sqlite-serialization';
import { PAYMENT_EVENT_TYPE } from './registrar-evento-pago';
import { ClientePago } from '../infrastructure/cliente-pago.entity';

export const PAYMENT_EVENT_CONSUMER = 'payment-event-v1';
const consumer = PAYMENT_EVENT_CONSUMER;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Consumidor de eventos de pago normalizados. Idempotente por (consumer, messageId) vía inbox.
 *  - payment.succeeded  → activa la suscripción (pago inicial) o renueva `proximoCobro` (recurrente).
 *  - payment.failed     → pausa la suscripción si el cobro recurrente fue rechazado.
 *  - subscription.canceled → marca la suscripción cancelada.
 *  - checkout.expired   → la solicitud expira y se libera el candado de "pedido en curso".
 */
export class ProcesarPago {
  constructor(private readonly db: DataSource) {}

  async execute(message: MessageEnvelope): Promise<DeliveryOutcome> {
    const event = (message.payload as { event?: PaymentEvent } | null)?.event;
    if (message.type !== PAYMENT_EVENT_TYPE || message.version !== 1 || !event || event.solicitudId !== message.requestId) return 'reject';

    try {
      return await serializeSqlite(this.db, () => this.db.transaction(async (manager): Promise<DeliveryOutcome> => {
        const outbox = await manager.getRepository(MensajeOutbox).findOneBy({ id: message.messageId, solicitudId: message.requestId });
        if (!outbox || outbox.tipo !== message.type) return 'reject';
        const requests = manager.getRepository(SolicitudSuscripcion);
        const request = await requests.findOneBy({ id: message.requestId });
        if (!request || request.tenantId !== message.tenantId) return 'reject';
        const inbox = manager.getRepository(MensajeInbox);
        if (await inbox.findOneBy({ consumer, messageId: message.messageId })) return 'ack';

        const subscriptions = manager.getRepository(Suscripcion);
        const subscription = request.suscripcionId ? await subscriptions.findOneBy({ id: request.suscripcionId }) : null;

        switch (event.kind) {
          case 'payment.succeeded': {
            if (request.estado === 'esperando_pago') {
              const box = await manager.getRepository(CajaMensual).findOneBy({ id: request.cajaMensualId });
              if (!box) return 'reject';
              const periodEnd = event.periodEnd ? new Date(event.periodEnd) : null;
              const created = await subscriptions.save({
                suscriptorId: request.suscriptorId, cajaMensualId: request.cajaMensualId, tenantId: request.tenantId,
                categoria: box.categoria, montoMensual: Number(request.precioConfirmado), estado: 'activa',
                fechaInicio: new Date(), proximoCobro: periodEnd ?? new Date(Date.now() + 30 * DAY_MS),
                paymentProvider: request.paymentProvider, providerSubscriptionId: event.providerSubscriptionId ?? null,
              });
              await requests.update(request.id, { estado: 'completado', suscripcionId: created.id });
              // Se recuerda el cliente del proveedor para reutilizarlo en próximas compras de este suscriptor.
              if (event.providerCustomerId && request.paymentProvider) {
                const customers = manager.getRepository(ClientePago);
                if (!(await customers.findOneBy({ provider: request.paymentProvider, suscriptorId: request.suscriptorId }))) {
                  await customers.insert({ id: randomUUID(), provider: request.paymentProvider, suscriptorId: request.suscriptorId, providerCustomerId: event.providerCustomerId });
                }
              }
            } else if (subscription) {
              // Cobro recurrente. Si la suscripción estaba pausada por un cobro rechazado, el pago la reactiva.
              const renewal: { proximoCobro?: Date; estado?: 'activa'; pausadaPorPago?: boolean } = {};
              if (event.periodEnd) renewal.proximoCobro = new Date(event.periodEnd);
              if (subscription.estado === 'pausada' && subscription.pausadaPorPago) {
                renewal.estado = 'activa';
                renewal.pausadaPorPago = false;
              }
              if (Object.keys(renewal).length) await subscriptions.update(subscription.id, renewal);
            } else {
              logger.warn(`Pago ${event.providerEventId} sin suscripción asociada (solicitud ${request.id}, estado ${request.estado})`);
              return 'reject';
            }
            break;
          }
          case 'payment.failed':
            // Un rechazo del primer cobro lo resuelve el propio checkout (reintento o expiración).
            if (subscription?.estado === 'activa') await subscriptions.update(subscription.id, { estado: 'pausada', pausadaPorPago: true });
            break;
          case 'subscription.canceled':
            if (subscription && subscription.estado !== 'cancelada') await subscriptions.update(subscription.id, { estado: 'cancelada' });
            break;
          case 'checkout.expired':
            if (request.estado === 'esperando_pago') await requests.update(request.id, { estado: 'expirado' });
            break;
          default:
            return 'reject';
        }
        await inbox.insert({ id: randomUUID(), consumer, messageId: message.messageId });
        return 'ack';
      }));
    } catch (error) {
      logger.error(`Error procesando evento de pago ${message.messageId}`, error);
      return 'retry';
    }
  }
}
