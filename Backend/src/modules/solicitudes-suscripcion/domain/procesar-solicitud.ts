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

const consumer = 'subscription-request-v1';

/** Internal handler: application startup must not subscribe until rollout policies are ready. */
export class ProcesarSolicitud {
  constructor(private readonly db: DataSource, private readonly retryPolicy: RetryPolicy = defaultRetryPolicy) {
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
      return await serializeSqlite(this.db, () => this.db.transaction(async (manager): Promise<DeliveryOutcome> => {
        const requests = manager.getRepository(SolicitudSuscripcion);
        const outbox = await manager.getRepository(MensajeOutbox).findOneBy({ id: message.messageId, solicitudId: message.requestId });
        if (!outbox || outbox.tipo !== message.type || outbox.version !== message.version) return 'reject';
        const request = await requests.findOneBy({ id: message.requestId });
        if (!request || request.tenantId !== message.tenantId) return 'reject';
        if ((attempt as number) < request.intentosProcesamiento || ['completado', 'rechazado', 'fallido'].includes(request.estado)) return 'ack';
        if ((attempt as number) > request.intentosProcesamiento) return 'reject';
        const inbox = manager.getRepository(MensajeInbox);
        if (await inbox.findOneBy({ consumer, messageId: message.messageId })) return 'ack';

        // Conditional write serializes competing deliveries of the same request.
        const claim = await requests.createQueryBuilder().update(SolicitudSuscripcion)
          .set({ estado: 'procesando' }).where('id = :id AND estado = :state AND intentosProcesamiento = :attempt', { id: request.id, state: 'pendiente', attempt }).execute();
        if (claim.affected !== 1) {
          const current = await requests.findOneBy({ id: request.id });
          return current && (current.intentosProcesamiento > (attempt as number) || ['completado', 'rechazado', 'fallido'].includes(current.estado)) ? 'ack' : 'retry';
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
}
