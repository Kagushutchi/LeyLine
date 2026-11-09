require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const { DataSource } = require('typeorm');
const { MensajeOutbox } = require('../dist/modules/solicitudes-suscripcion/infrastructure/outbox.entity');
const { OutboxRelay } = require('../dist/modules/solicitudes-suscripcion/infrastructure/outbox-relay');

async function setup(t) {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities: [MensajeOutbox], synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  await db.getRepository(MensajeOutbox).save({ id: 'message-1', solicitudId: 'request-1', tipo: 'subscription.requested', version: 1, contenido: JSON.stringify({ requestId: 'request-1', tenantId: 'tenant-1' }) });
  return db;
}
const transport = (publish) => ({ publish, subscribe: async () => {}, close: async () => {} });

test('two concurrent relays claim and publish a message once', async (t) => {
  const db = await setup(t);
  const messages = [];
  const adapter = transport(async (message) => { messages.push(message); });
  const results = await Promise.all([new OutboxRelay(db, adapter).runOnce(), new OutboxRelay(db, adapter).runOnce()]);
  assert.deepEqual(results.sort(), ['idle', 'published']);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].messageId, 'message-1');
  assert.equal((await db.getRepository(MensajeOutbox).findOneBy({ id: 'message-1' })).estado, 'publicado');
});

test('failed publication schedules backoff without marking published', async (t) => {
  const db = await setup(t);
  let now = 1000;
  let calls = 0;
  const relay = new OutboxRelay(db, transport(async () => { calls++; throw new Error('broker down'); }), { now: () => now, retryBaseMs: 100, retryMaxMs: 1000 });
  assert.equal(await relay.runOnce(), 'retry');
  assert.equal(await relay.runOnce(), 'idle');
  const row = await db.getRepository(MensajeOutbox).findOneBy({ id: 'message-1' });
  assert.equal(row.estado, 'pendiente');
  assert.equal(row.intentos, 1);
  assert.equal(Number(row.nextAttemptAt), 1100);
  now = 1100;
  assert.equal(await relay.runOnce(), 'retry');
  assert.equal(calls, 2);
});

test('failed mark after confirmation is recovered using the same message identity', async (t) => {
  const db = await setup(t);
  let now = 1000;
  const messages = [];
  const adapter = transport(async (message) => { messages.push(message.messageId); });
  const relay = new OutboxRelay(db, adapter, { now: () => now, leaseMs: 100 });
  await db.query("CREATE TRIGGER reject_mark BEFORE UPDATE ON mensajes_outbox WHEN NEW.estado = 'publicado' BEGIN SELECT RAISE(ABORT, 'mark failed'); END");
  await assert.rejects(relay.runOnce(), /mark failed/);
  assert.equal(await relay.runOnce(), 'idle');
  await db.query('DROP TRIGGER reject_mark');
  now = 1100;
  assert.equal(await relay.runOnce(), 'published');
  assert.deepEqual(messages, ['message-1', 'message-1']);
  assert.equal(Number((await db.getRepository(MensajeOutbox).findOneByOrFail({ id: 'message-1' })).publishedAt), 1100);
});

test('an expired claimant cannot overwrite the newer claimant', async (t) => {
  const db = await setup(t);
  let now = 1000;
  let release;
  let entered;
  const started = new Promise((resolve) => { entered = resolve; });
  const waiting = new Promise((resolve) => { release = resolve; });
  const slow = new OutboxRelay(db, transport(async () => { entered(); await waiting; }), { now: () => now, leaseMs: 100 });
  const operation = slow.runOnce();
  await started;
  now = 1100;
  const fast = new OutboxRelay(db, transport(async () => {}), { now: () => now, leaseMs: 100 });
  assert.equal(await fast.runOnce(), 'published');
  release();
  assert.equal(await operation, 'lease-lost');
  assert.equal((await db.getRepository(MensajeOutbox).findOneBy({ id: 'message-1' })).estado, 'publicado');
});
