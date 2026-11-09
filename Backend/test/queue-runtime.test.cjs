require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const { readQueueConfig } = require('../dist/common/messaging/queue-config');
const { startQueueWorker, startQueueSchedules } = require('../dist/modules/solicitudes-suscripcion/infrastructure/queue-runtime');

test('worker fails closed before attempting to connect unless explicitly enabled', async () => {
  await assert.rejects(startQueueWorker({ RABBITMQ_URL: 'amqp://localhost' }), /QUEUE_RUNTIME_ENABLED/);
});

test('scheduler invokes reconciler and shutdown waits for in-flight work and stops rescheduling', async () => {
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const waiting = new Promise(resolve => { release = resolve; });
  let relays = 0, reconciliations = 0;
  const stop = startQueueSchedules({ runOnce: async () => { relays++; } }, { runOnce: async () => { reconciliations++; entered(); await waiting; } }, 50);
  await started;
  let stopped = false;
  const done = stop().then(() => { stopped = true; });
  await Promise.resolve();
  assert.equal(stopped, false);
  release();
  await done;
  await new Promise(resolve => setTimeout(resolve, 70));
  assert.equal(relays, 1);
  assert.equal(reconciliations, 1);
  assert.throws(() => startQueueSchedules({ runOnce: async () => {} }, { runOnce: async () => {} }, 0));
});

test('validates broker URL, topology and polling limits without exposing credentials', () => {
  const config = readQueueConfig({ RABBITMQ_URL: 'amqp://localhost', OUTBOX_POLL_INTERVAL_MS: '250' });
  assert.equal(config.pollIntervalMs, 250);
  assert.equal(config.topology.prefetch, 20);
  assert.equal(config.relayBatchSize, 50);
  assert.throws(() => readQueueConfig({}), /RABBITMQ_URL/);
  assert.throws(() => readQueueConfig({ RABBITMQ_URL: 'https://localhost' }), /Invalid RABBITMQ_URL/);
  assert.throws(() => readQueueConfig({ RABBITMQ_URL: 'amqp://localhost', RABBITMQ_PREFETCH: '0' }), /Invalid RABBITMQ_PREFETCH/);
  assert.throws(() => readQueueConfig({ RABBITMQ_URL: 'amqp://localhost', RABBITMQ_RECONNECT_DELAY_MS: '' }), /Invalid RABBITMQ_RECONNECT_DELAY_MS/);
  assert.throws(() => readQueueConfig({ RABBITMQ_URL: 'amqp://localhost', RABBITMQ_QUEUE: ' ' }), /Invalid RabbitMQ topology/);
});
