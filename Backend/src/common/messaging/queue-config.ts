import { RabbitTopology } from './rabbitmq-transport';

export interface QueueConfig {
  url: string;
  topology: RabbitTopology;
  maxConnectAttempts: number;
  reconnectDelayMs: number;
  pollIntervalMs: number;
  relayBatchSize: number;
}

function integer(env: NodeJS.ProcessEnv, key: string, fallback: number, min: number, max: number): number {
  if (env[key] !== undefined && !/^\d+$/.test(env[key]!)) throw new Error(`Invalid ${key}`);
  const value = env[key] === undefined ? fallback : Number(env[key]);
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Invalid ${key}`);
  return value;
}

export function readQueueConfig(env: NodeJS.ProcessEnv): QueueConfig {
  const value = env.RABBITMQ_URL;
  if (!value) throw new Error('RABBITMQ_URL is required');
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error('Invalid RABBITMQ_URL'); }
  if (!['amqp:', 'amqps:'].includes(parsed.protocol) || !parsed.hostname) throw new Error('Invalid RABBITMQ_URL');
  const exchange = env.RABBITMQ_EXCHANGE ?? 'subscription.requests';
  const queue = env.RABBITMQ_QUEUE ?? 'subscription.requests';
  const routingKey = env.RABBITMQ_ROUTING_KEY ?? 'subscription.requested';
  if ([exchange, queue, routingKey].some((name) => !name.trim() || name !== name.trim() || name.length > 255)) {
    throw new Error('Invalid RabbitMQ topology');
  }
  return {
    url: value,
    topology: { exchange, queue, routingKey, prefetch: integer(env, 'RABBITMQ_PREFETCH', 20, 1, 1000) },
    maxConnectAttempts: integer(env, 'RABBITMQ_CONNECT_ATTEMPTS', 5, 1, 100),
    reconnectDelayMs: integer(env, 'RABBITMQ_RECONNECT_DELAY_MS', 1000, 0, 300000),
    pollIntervalMs: integer(env, 'OUTBOX_POLL_INTERVAL_MS', 50, 10, 300000),
    relayBatchSize: integer(env, 'OUTBOX_BATCH_SIZE', 50, 1, 1000),
  };
}
