import { randomUUID } from 'crypto';
import { DeliveryOutcome, MessageEnvelope, MessageHandler, MessageTransport } from './message-transport';

/** Structural subset of amqplib's confirm and consumer channels, injected at startup. */
export interface RabbitMessage {
  content: Buffer;
  properties: { correlationId?: string };
  fields?: { replyCode?: number; replyText?: string };
}

export interface RabbitChannel {
  assertExchange(name: string, type: string, options: { durable: boolean }): Promise<unknown>;
  assertQueue(name: string, options: { durable: boolean; arguments?: Record<string, unknown> }): Promise<unknown>;
  bindQueue(queue: string, exchange: string, key: string): Promise<unknown>;
  prefetch(count: number): Promise<unknown>;
  publish(exchange: string, key: string, content: Buffer, options: object, callback: (error: Error | null) => void): boolean;
  consume(queue: string, callback: (message: RabbitMessage | null) => void, options: { noAck: boolean }): Promise<{ consumerTag: string }>;
  ack(message: RabbitMessage): void;
  nack(message: RabbitMessage, allUpTo: boolean, requeue: boolean): void;
  cancel(tag: string): Promise<unknown>;
  close(): Promise<void>;
  on(event: 'return' | 'error' | 'close', listener: (...args: any[]) => void): this;
  removeListener(event: 'return' | 'error' | 'close', listener: (...args: any[]) => void): this;
}

export interface RabbitTopology {
  exchange: string;
  queue: string;
  routingKey: string;
  prefetch: number;
}

type Pending = { returned?: Error; reject: (error: Error) => void };

/** An instance owns both channels. Connection/reconnection and retry limits belong to its caller. */
export class RabbitMqTransport implements MessageTransport {
  private readonly pending = new Map<string, Pending>();
  private readonly inFlight = new Set<Promise<void>>();
  private consumerTag?: string;
  private closed = false;
  private failed?: Error;
  private closePromise?: Promise<void>;
  private readonly onReturn = (message: RabbitMessage): void => {
    const id = message.properties.correlationId;
    const entry = id && this.pending.get(id);
    if (entry) entry.returned = new Error(`RabbitMQ returned unroutable message (${message.fields?.replyCode ?? 'unknown'}): ${message.fields?.replyText ?? ''}`);
  };
  private readonly onError = (error: Error): void => { this.fail(error); };
  private readonly onChannelClose = (): void => { if (!this.closed) this.fail(new Error('RabbitMQ channel closed before confirmation')); };

  constructor(private readonly publisher: RabbitChannel, private readonly consumer: RabbitChannel, private readonly topology: RabbitTopology, private readonly onFailure: (error: Error) => void = () => {}) {
    if (publisher === consumer) throw new Error('Separate publisher confirm and consumer channels are required');
    if (!topology.exchange || !topology.queue || !topology.routingKey || !Number.isInteger(topology.prefetch) || topology.prefetch < 1) {
      throw new Error('Invalid RabbitMQ topology');
    }
    publisher.on('return', this.onReturn).on('error', this.onError).on('close', this.onChannelClose);
    consumer.on('error', this.onError).on('close', this.onChannelClose);
  }

  async initialize(): Promise<void> {
    this.assertOpen();
    const deadLetterExchange = `${this.topology.exchange}.dlx`;
    const deadLetterQueue = `${this.topology.queue}.dlq`;
    await this.publisher.assertExchange(this.topology.exchange, 'direct', { durable: true });
    await this.publisher.assertExchange(deadLetterExchange, 'direct', { durable: true });
    await this.consumer.assertQueue(deadLetterQueue, { durable: true });
    await this.consumer.bindQueue(deadLetterQueue, deadLetterExchange, this.topology.routingKey);
    await this.consumer.assertQueue(this.topology.queue, { durable: true, arguments: {
      'x-dead-letter-exchange': deadLetterExchange,
      'x-dead-letter-routing-key': this.topology.routingKey,
    } });
    await this.consumer.bindQueue(this.topology.queue, this.topology.exchange, this.topology.routingKey);
    await this.consumer.prefetch(this.topology.prefetch);
  }

  publish(message: MessageEnvelope): Promise<void> {
    this.assertOpen();
    if (!message.messageId) return Promise.reject(new Error('messageId is required'));
    const publishId = randomUUID();
    const content = Buffer.from(JSON.stringify(message));
    return new Promise((resolve, reject) => {
      const entry: Pending = { reject };
      this.pending.set(publishId, entry);
      try {
        this.publisher.publish(this.topology.exchange, this.topology.routingKey, content, {
          persistent: true, mandatory: true, contentType: 'application/json',
          messageId: message.messageId, correlationId: publishId,
        }, (error) => {
          if (!this.pending.delete(publishId)) return;
          if (error) reject(error);
          else if (entry.returned) reject(entry.returned);
          else resolve();
        });
      } catch (error) {
        this.pending.delete(publishId);
        reject(error);
      }
    });
  }

  async subscribe(handler: MessageHandler): Promise<void> {
    this.assertOpen();
    if (this.consumerTag) throw new Error('Consumer already registered');
    const { consumerTag } = await this.consumer.consume(this.topology.queue, (message) => {
      if (!message) {
        this.fail(new Error('RabbitMQ consumer cancelled by broker'));
        return;
      }
      const work = this.handle(message, handler);
      this.inFlight.add(work);
      void work.then(() => this.inFlight.delete(work), (error: Error) => {
        this.inFlight.delete(work);
        this.fail(error);
      });
    }, { noAck: false });
    this.consumerTag = consumerTag;
  }

  private async handle(message: RabbitMessage, handler: MessageHandler): Promise<void> {
    let outcome: DeliveryOutcome;
    let envelope: unknown;
    try {
      envelope = JSON.parse(message.content.toString('utf8'));
    } catch {
      this.consumer.nack(message, false, false);
      return;
    }
    if (!isEnvelope(envelope)) {
      this.consumer.nack(message, false, false);
      return;
    }
    try {
      outcome = await handler(envelope);
    } catch {
      // One attempt per delivery: dead-letter rather than an unbounded hot requeue.
      this.consumer.nack(message, false, false);
      return;
    }
    if (outcome === 'ack') this.consumer.ack(message);
    else this.consumer.nack(message, false, false);
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closed = true;
    this.closePromise = this.closeChannels();
    return this.closePromise;
  }

  /** Reject uncertain publications immediately when the owning connection fails. */
  invalidate(error: Error): void {
    this.failed = error;
    this.failPending(error);
  }

  private async closeChannels(): Promise<void> {
    try {
      let cancelError: unknown;
      try {
        if (this.consumerTag) await this.consumer.cancel(this.consumerTag);
      } catch (error) {
        cancelError = error;
      }
      await Promise.allSettled([...this.inFlight]);
      this.failPending(new Error('RabbitMQ transport closed before confirmation'));
      const results = await Promise.allSettled([this.publisher.close(), this.consumer.close()]);
      const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (cancelError) throw cancelError;
      if (failed) throw failed.reason;
    } finally {
      this.publisher.removeListener('return', this.onReturn).removeListener('error', this.onError).removeListener('close', this.onChannelClose);
      this.consumer.removeListener('error', this.onError).removeListener('close', this.onChannelClose);
    }
  }

  private fail(error: Error): void {
    this.failed = error;
    this.failPending(error);
    this.onFailure(error);
  }

  private failPending(error: Error): void {
    for (const entry of this.pending.values()) entry.reject(error);
    this.pending.clear();
  }

  private assertOpen(): void {
    if (this.closed) throw new Error('RabbitMQ transport is closed');
    if (this.failed) throw this.failed;
  }
}

function isEnvelope(value: unknown): value is MessageEnvelope {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return ['messageId', 'type', 'requestId', 'tenantId', 'correlationId'].every((key) => typeof message[key] === 'string' && message[key] !== '')
    && Number.isInteger(message.version) && (message.version as number) > 0 && 'payload' in message;
}
