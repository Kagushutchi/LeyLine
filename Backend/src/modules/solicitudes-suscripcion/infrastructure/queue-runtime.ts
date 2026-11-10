import 'reflect-metadata';
import { DatabaseFactory } from '../../../config/database.config';
import { createRabbitMqTransport } from '../../../common/messaging/rabbitmq-factory';
import { readQueueConfig } from '../../../common/messaging/queue-config';
import { OutboxRelay } from './outbox-relay';
import { ProcesarSolicitud } from '../domain/procesar-solicitud';
import { RetryReconciler } from './retry-reconciler';
import { createMessageRouter } from '../../../common/messaging/message-router';
import { createPaymentStrategy } from '../../../common/patterns/strategies/payment-strategy.registry';
import { envConfig } from '../../../config/env.config';
import { ProcesarPago } from '../../pagos/domain/procesar-pago';
import { PaymentEventReconciler } from '../../pagos/infrastructure/payment-event-reconciler';
import { assertFxConfigured } from '../../pagos/domain/currency-converter';

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
    const strategy = createPaymentStrategy();
    // Falla al arrancar (no al primer cobro) si hay que convertir de moneda y falta el tipo de cambio.
    if (strategy) assertFxConfigured(envConfig.payments.baseCurrency, envConfig.payments.currency, envConfig.payments.fxRate);
    const processor = new ProcesarSolicitud(db, undefined, strategy
      ? { strategy, baseCurrency: envConfig.payments.baseCurrency, currency: envConfig.payments.currency, fxRate: envConfig.payments.fxRate, successUrl: envConfig.payments.successUrl, cancelUrl: envConfig.payments.cancelUrl, checkoutTtlMinutes: envConfig.payments.checkoutTtlMinutes }
      : null);
    const payments = new ProcesarPago(db);
    await transport.subscribe(createMessageRouter({
      'subscription.requested': (message) => processor.execute(message),
      'payment.event': (message) => payments.execute(message),
    }));
    const relay = new OutboxRelay(db, transport, { batchSize: config.relayBatchSize });
    const requestReconciler = new RetryReconciler(db);
    const paymentReconciler = new PaymentEventReconciler(db);
    // Un solo ciclo recupera tanto solicitudes colgadas como eventos de pago que no llegaron a procesarse.
    const reconciler = { runOnce: async () => { await requestReconciler.runOnce(); await paymentReconciler.runOnce(); } };
    const stopSchedules = startQueueSchedules(relay, reconciler, config.pollIntervalMs);
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
