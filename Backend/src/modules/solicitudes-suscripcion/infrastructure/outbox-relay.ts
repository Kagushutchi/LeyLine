import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { MessageEnvelope, MessageTransport } from '../../../common/messaging/message-transport';
import { MensajeOutbox } from './outbox.entity';
import { serializeSqlite } from '../domain/sqlite-serialization';

export interface OutboxRelayOptions {
  leaseMs?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  /** Rows claimed and published concurrently per runOnce(); 1 keeps the original behaviour. */
  batchSize?: number;
  now?: () => number;
}

/** One invocation processes at most `batchSize` rows; scheduling belongs to the host process. */
export class OutboxRelay {
  private readonly leaseMs: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;
  private readonly batchSize: number;
  private readonly now: () => number;

  constructor(private readonly db: DataSource, private readonly transport: MessageTransport, options: OutboxRelayOptions = {}) {
    this.leaseMs = options.leaseMs ?? 30000;
    this.retryBaseMs = options.retryBaseMs ?? 1000;
    this.retryMaxMs = options.retryMaxMs ?? 60000;
    this.batchSize = options.batchSize ?? 1;
    this.now = options.now ?? Date.now;
    if (!Number.isInteger(this.batchSize) || this.batchSize < 1 || this.batchSize > 1000) throw new Error('Invalid outbox relay batch size');
    if (this.leaseMs <= 0 || this.retryBaseMs <= 0 || this.retryMaxMs < this.retryBaseMs) {
      throw new Error('Invalid outbox relay timing configuration');
    }
  }

  async runOnce(): Promise<'idle' | 'published' | 'retry' | 'lease-lost'> {
    const claimed = await serializeSqlite(this.db, () => this.claim(this.batchSize));
    if (!claimed.length) return 'idle';
    const outcomes = await Promise.all(claimed.map((item) => this.publishOne(item)));
    // Any progress counts as published so the scheduler keeps draining.
    if (outcomes.includes('published')) return 'published';
    return outcomes.includes('retry') ? 'retry' : 'lease-lost';
  }

  private async publishOne({ candidate, token }: { candidate: MensajeOutbox; token: string }): Promise<'published' | 'retry' | 'lease-lost'> {
    const repository = this.db.getRepository(MensajeOutbox);
    const owned = () => repository.createQueryBuilder().update(MensajeOutbox)
      .where('id = :id AND estado = :state AND claimToken = :token AND claimUntil > :now', {
        id: candidate.id, state: 'pendiente', token, now: this.now(),
      });

    try {
      const content: unknown = JSON.parse(candidate.contenido);
      if (!content || typeof content !== 'object' || typeof (content as any).tenantId !== 'string'
        || (content as any).requestId !== candidate.solicitudId) throw new Error('Invalid outbox message');
      const envelope: MessageEnvelope = {
        messageId: candidate.id, type: candidate.tipo, version: candidate.version,
        requestId: candidate.solicitudId, tenantId: (content as any).tenantId,
        correlationId: candidate.solicitudId, payload: content,
      };
      await this.transport.publish(envelope);
    } catch {
      const attempts = candidate.intentos + 1;
      const delay = Math.min(this.retryMaxMs, this.retryBaseMs * 2 ** Math.min(attempts - 1, 30));
      const result = await serializeSqlite(this.db, () => owned().set({ intentos: attempts, nextAttemptAt: this.now() + delay, claimToken: null, claimUntil: null }).execute());
      return result.affected === 1 ? 'retry' : 'lease-lost';
    }

    // If this update fails, preserve the lease and let it expire: publication may
    // have succeeded, so a later attempt must reuse the same message identity.
    const result = await serializeSqlite(this.db, () => owned().set({ estado: 'publicado', publishedAt: this.now(), claimToken: null, claimUntil: null, nextAttemptAt: null }).execute());
    return result.affected === 1 ? 'published' : 'lease-lost';
  }

  private async claim(limit: number): Promise<{ candidate: MensajeOutbox; token: string }[]> {
    const repository = this.db.getRepository(MensajeOutbox);
    const current = this.now();
    const candidates = await repository.createQueryBuilder('message')
      .where('message.estado = :state', { state: 'pendiente' })
      .andWhere('(message.claimUntil IS NULL OR message.claimUntil <= :current)', { current })
      .andWhere('(message.nextAttemptAt IS NULL OR message.nextAttemptAt <= :current)', { current })
      .orderBy('message.createdAt', 'ASC').addOrderBy('message.id', 'ASC').limit(limit).getMany();

    const claimed: { candidate: MensajeOutbox; token: string }[] = [];
    for (const candidate of candidates) {
      const token = randomUUID();
      // The conditional update is the claim: two relays may see the same candidate,
      // but only one can change an unclaimed or expired row.
      const claim = await repository.createQueryBuilder().update(MensajeOutbox)
        .set({ claimToken: token, claimUntil: current + this.leaseMs })
        .where('id = :id AND estado = :state', { id: candidate.id, state: 'pendiente' })
        .andWhere('(claimUntil IS NULL OR claimUntil <= :current)', { current })
        .andWhere('(nextAttemptAt IS NULL OR nextAttemptAt <= :current)', { current }).execute();
      if (claim.affected === 1) claimed.push({ candidate, token });
    }
    return claimed;
  }
}
