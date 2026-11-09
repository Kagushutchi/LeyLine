import 'reflect-metadata';
import { DatabaseFactory } from '../../../config/database.config';
import { createRabbitMqTransport } from '../../../common/messaging/rabbitmq-factory';
import { readQueueConfig } from '../../../common/messaging/queue-config';
import { OutboxRelay } from './outbox-relay';
import { ProcesarSolicitud } from '../domain/procesar-solicitud';
import { RetryReconciler } from './retry-reconciler';

// Rollout gate: the operator sets QUEUE_RUNTIME_ENABLED=true only after the
// real-broker/database validation in docs/pendientes-cierre-colas-suscripciones.md.
export const queueRuntimeEnabled = (env: NodeJS.ProcessEnv): boolean => env.QUEUE_RUNTIME_ENABLED === 'true';

export function startQueueSchedules(
  relay: { runOnce(): Promise<unknown> }, reconciler: { runOnce(): Promise<unknown> }, intervalMs: number,
): () => Promise<void> {
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 50 || intervalMs > 300000) throw new Error('Invalid queue schedule interval');
  let stopping = false;
  let timer: NodeJS.Timeout | undefined;
  let inFlight: Promise<void> | undefined;
  const tick = () => {
    if (stopping) return;
    inFlight = (async () => {
      try {
        // Drain the backlog without sleeping; bounded so the reconciler still runs.
        const deadline = Date.now() + 2000;
        while (!stopping && Date.now() < deadline && await relay.runOnce() === 'published') { /* keep draining */ }
      } catch { process.stderr.write('Outbox relay failed\n'); }
      if (!stopping) {
        try { await reconciler.runOnce(); } catch { process.stderr.write('Retry reconciler failed\n'); }
      }
    })().finally(() => { if (!stopping) timer = setTimeout(tick, intervalMs); });
  };
  tick();
  return async () => { stopping = true; if (timer) clearTimeout(timer); await inFlight; };
}

export async function startQueueWorker(env: NodeJS.ProcessEnv = process.env): Promise<() => Promise<void>> {
  if (!queueRuntimeEnabled(env)) throw new Error('Queue worker disabled: set QUEUE_RUNTIME_ENABLED=true after runtime validation');
  const config = readQueueConfig(env);
  const db = DatabaseFactory.createDataSource();
  await db.initialize();
  let transport: Awaited<ReturnType<typeof createRabbitMqTransport>> | undefined;
  try {
    transport = await createRabbitMqTransport({
      url: config.url, topology: config.topology, maxConnectAttempts: config.maxConnectAttempts,
      reconnectDelayMs: config.reconnectDelayMs,
      onFailure: () => process.stderr.write('RabbitMQ connection failed\n'),
    });
    const processor = new ProcesarSolicitud(db);
    await transport.subscribe((message) => processor.execute(message));
    const relay = new OutboxRelay(db, transport, { batchSize: config.relayBatchSize });
    const stopSchedules = startQueueSchedules(relay, new RetryReconciler(db), config.pollIntervalMs);
    let shutdown: Promise<void> | undefined;
    return () => {
      if (!shutdown) shutdown = (async () => {
        await stopSchedules();
        try { await transport!.close(); } finally { await db.destroy(); }
      })();
      return shutdown;
    };
  } catch (error) {
    try { await transport?.close(); } finally { await db.destroy(); }
    throw error;
  }
}
