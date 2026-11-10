import { DataSource } from 'typeorm';
import { logger } from '../../../common/utils/logger';
import { MensajeOutbox } from '../../solicitudes-suscripcion/infrastructure/outbox.entity';
import { serializeSqlite } from '../../solicitudes-suscripcion/domain/sqlite-serialization';
import { PAYMENT_EVENT_TYPE } from '../domain/registrar-evento-pago';
import { PAYMENT_EVENT_CONSUMER } from '../domain/procesar-pago';

export interface PaymentReconcilerOptions {
  /** Tiempo tras la publicación a partir del cual un evento sin consumir se considera perdido. */
  staleAfterMs?: number;
  /** Republicaciones máximas antes de dejarlo en `fallido` (evento que nunca se puede procesar). */
  maxAttempts?: number;
  now?: () => number;
}

/**
 * Recupera eventos de pago que se publicaron pero nunca se procesaron (el consumidor falló y RabbitMQ los mandó a la
 * cola de mensajes muertos). Sin esto un cliente podría haber pagado en el proveedor y no tener su suscripción.
 * Es seguro republicar: el consumidor es idempotente por (consumer, messageId) vía inbox.
 */
export class PaymentEventReconciler {
  private readonly staleAfterMs: number;
  private readonly maxAttempts: number;
  private readonly now: () => number;

  constructor(private readonly db: DataSource, options: PaymentReconcilerOptions = {}) {
    this.staleAfterMs = options.staleAfterMs ?? 60000;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.now = options.now ?? Date.now;
    if (this.staleAfterMs <= 0 || this.maxAttempts < 1) throw new Error('Invalid payment reconciler options');
  }

  async runOnce(): Promise<'idle' | 'republished' | 'failed'> {
    return serializeSqlite(this.db, async () => {
      const outbox = this.db.getRepository(MensajeOutbox);
      const cutoff = this.now() - this.staleAfterMs;
      const lost = await outbox.createQueryBuilder('m')
        .where('m.tipo = :type AND m.estado = :published AND m.publishedAt IS NOT NULL AND m.publishedAt <= :cutoff',
          { type: PAYMENT_EVENT_TYPE, published: 'publicado', cutoff })
        .andWhere('NOT EXISTS (SELECT 1 FROM mensajes_inbox i WHERE i.consumer = :consumer AND i."messageId" = m.id)',
          { consumer: PAYMENT_EVENT_CONSUMER })
        .orderBy('m.publishedAt', 'ASC').getOne();
      if (!lost) return 'idle';

      const guard = { id: lost.id, estado: 'publicado', publishedAt: Number(lost.publishedAt) };
      if (lost.intentos >= this.maxAttempts) {
        // Requiere intervención manual: se deja de republicar para no entrar en un ciclo infinito.
        await outbox.update(guard, { estado: 'fallido' });
        logger.error(`Evento de pago ${lost.id} (solicitud ${lost.solicitudId}) no pudo procesarse tras ${lost.intentos} intentos`);
        return 'failed';
      }
      const result = await outbox.update(guard, {
        estado: 'pendiente', intentos: lost.intentos + 1, publishedAt: null, claimToken: null, claimUntil: null, nextAttemptAt: this.now(),
      });
      return result.affected === 1 ? 'republished' : 'idle';
    });
  }
}
