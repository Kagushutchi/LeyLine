import { DataSource, In } from 'typeorm';
import { SolicitudSuscripcion } from './solicitud.entity';
import { MensajeOutbox } from './outbox.entity';
import { serializeSqlite } from '../domain/sqlite-serialization';

export interface RetryPolicy { maxAttempts: number; retryDelayMs: number; staleAfterMs: number; now?: () => number }
export const defaultRetryPolicy: RetryPolicy = { maxAttempts: 3, retryDelayMs: 1000, staleAfterMs: 60000 };
class StaleRetry extends Error {}

/** Atomically advances one delivery generation; duplicate failures cannot spend it twice. */
export async function scheduleRetry(db: DataSource, requestId: string, messageId: string, attempt: number,
  policy: RetryPolicy, staleBefore?: Date, expectedTenant?: string): Promise<'scheduled' | 'exhausted' | 'stale'> {
  try { return await db.transaction(async (manager) => {
    const requests = manager.getRepository(SolicitudSuscripcion);
    const outbox = manager.getRepository(MensajeOutbox);
    const message = await outbox.findOneBy({ id: messageId, solicitudId: requestId });
    if (!message || (staleBefore && (message.estado !== 'publicado' || message.publishedAt == null || Number(message.publishedAt) > staleBefore.getTime()))) return 'stale';
    const request = await requests.findOneBy({ id: requestId });
    if (!request || (expectedTenant && request.tenantId !== expectedTenant)) return 'stale';
    const next = attempt + 1;
    const exhausted = next >= policy.maxAttempts;
    if (staleBefore) {
      // Lock and compare the observed publication generation inside this transaction.
      const locked = await outbox.createQueryBuilder().update(MensajeOutbox)
        .set({ estado: 'publicado' })
        .where('id = :id AND estado = :state AND publishedAt = :publishedAt AND publishedAt <= :cutoff', {
          id: messageId, state: 'publicado', publishedAt: message.publishedAt, cutoff: staleBefore.getTime(),
        }).execute();
      if (locked.affected !== 1) return 'stale';
    }
    // 'procesando' persiste sólo cuando hay cobro: un proceso caído tras reclamar la solicitud se recupera igual que 'pendiente'.
    const where = { id: requestId, estado: In(['pendiente', 'procesando']), intentosProcesamiento: attempt };
    const updated = await requests.update(where, {
      intentosProcesamiento: next, estado: exhausted ? 'fallido' : 'pendiente', updatedAt: new Date((policy.now ?? Date.now)()),
    });
    if (updated.affected !== 1) throw new StaleRetry();
    if (!exhausted) {
      const content: unknown = JSON.parse(message.contenido);
      if (!content || typeof content !== 'object' || Array.isArray(content)) throw new Error('Invalid outbox content');
      const result = await outbox.update({ id: messageId, solicitudId: requestId }, {
        estado: 'pendiente', claimToken: null, claimUntil: null, publishedAt: null,
        nextAttemptAt: (policy.now ?? Date.now)() + policy.retryDelayMs,
        contenido: JSON.stringify({ ...content, attempt: next }),
      });
      if (result.affected !== 1) throw new Error('Outbox message disappeared');
    }
    return exhausted ? 'exhausted' : 'scheduled';
  }); } catch (error) { if (error instanceof StaleRetry) return 'stale'; throw error; }
}

/** Reclaims lost or dead-lettered deliveries after an observation window. */
export class RetryReconciler {
  constructor(private readonly db: DataSource, private readonly policy: RetryPolicy = defaultRetryPolicy) {
    if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1 || policy.retryDelayMs < 0 || policy.staleAfterMs <= 0) {
      throw new Error('Invalid retry policy');
    }
  }

  async runOnce(): Promise<'idle' | 'scheduled' | 'exhausted'> {
    return serializeSqlite(this.db, () => this.reconcileOne());
  }

  private async reconcileOne(): Promise<'idle' | 'scheduled' | 'exhausted'> {
    const cutoff = new Date((this.policy.now ?? Date.now)() - this.policy.staleAfterMs);
    const message = await this.db.getRepository(MensajeOutbox).createQueryBuilder('message')
      .innerJoin(SolicitudSuscripcion, 'request', 'message.solicitudId = request.id AND request.estado IN (:...open)', { open: ['pendiente', 'procesando'] })
      .where('message.tipo = :type AND message.estado = :published AND message.publishedAt IS NOT NULL AND message.publishedAt <= :cutoff', { type: 'subscription.requested', published: 'publicado', cutoff: cutoff.getTime() })
      .orderBy('message.publishedAt', 'ASC').getOne();
    if (!message) return 'idle';
    const candidate = await this.db.getRepository(SolicitudSuscripcion).findOneBy({ id: message.solicitudId, estado: In(['pendiente', 'procesando']) });
    if (!candidate) return 'idle';
    const result = await scheduleRetry(this.db, candidate.id, message.id, candidate.intentosProcesamiento, this.policy, cutoff);
    return result === 'stale' ? 'idle' : result;
  }
}
