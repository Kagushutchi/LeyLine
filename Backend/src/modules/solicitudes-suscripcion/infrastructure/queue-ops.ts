import { DataSource } from 'typeorm';
import { SolicitudSuscripcion } from './solicitud.entity';
import { MensajeOutbox } from './outbox.entity';

export interface QueueStats {
  requestsByState: Record<string, number>;
  outboxPending: number;
  oldestPendingOutboxAgeMs: number | null;
  oldestUnconfirmedPublishedAgeMs: number | null;
}

/** Counts and ages only: no payloads, identities or secrets. */
export async function collectQueueStats(db: DataSource, now: number = Date.now()): Promise<QueueStats> {
  const rows: { estado: string; total: string | number }[] = await db.getRepository(SolicitudSuscripcion)
    .createQueryBuilder('r').select('r.estado', 'estado').addSelect('COUNT(*)', 'total').groupBy('r.estado').getRawMany();
  const requestsByState: Record<string, number> = {};
  for (const row of rows) requestsByState[row.estado] = Number(row.total);
  const outbox = db.getRepository(MensajeOutbox);
  const pending = await outbox.find({ where: { estado: 'pendiente' }, order: { createdAt: 'ASC' } });
  const published = await outbox.createQueryBuilder('m')
    .innerJoin(SolicitudSuscripcion, 'r', 'r.id = m.solicitudId AND r.estado IN (:...open)', { open: ['pendiente', 'procesando'] })
    .where('m.estado = :s AND m.publishedAt IS NOT NULL', { s: 'publicado' }).orderBy('m.publishedAt', 'ASC').getOne();
  return {
    requestsByState,
    outboxPending: pending.length,
    oldestPendingOutboxAgeMs: pending.length ? now - pending[0].createdAt.getTime() : null,
    oldestUnconfirmedPublishedAgeMs: published?.publishedAt != null ? now - Number(published.publishedAt) : null,
  };
}

/** Authorized replay of a request that ended `fallido`; same logical identity, new delivery generation. */
export async function replayFailedRequest(db: DataSource, requestId: string, operator: string): Promise<void> {
  if (!operator.trim()) throw new Error('Operator is required for an audited replay');
  await db.transaction(async (manager) => {
    const requests = manager.getRepository(SolicitudSuscripcion);
    const request = await requests.findOneBy({ id: requestId });
    if (!request) throw new Error('Request not found');
    if (request.estado !== 'fallido') throw new Error(`Only failed requests can be replayed (state: ${request.estado})`);
    const outbox = manager.getRepository(MensajeOutbox);
    const message = await outbox.findOneBy({ solicitudId: requestId });
    if (!message) throw new Error('Outbox message not found');
    const content = JSON.parse(message.contenido) as Record<string, unknown>;
    delete content.attempt;
    await requests.update(requestId, { estado: 'pendiente', intentosProcesamiento: 0, updatedAt: new Date() });
    await outbox.update(message.id, {
      estado: 'pendiente', claimToken: null, claimUntil: null, publishedAt: null, nextAttemptAt: null,
      contenido: JSON.stringify(content),
    });
  });
  process.stdout.write(`${JSON.stringify({ event: 'request.replayed', requestId, operator, at: new Date().toISOString() })}\n`);
}
