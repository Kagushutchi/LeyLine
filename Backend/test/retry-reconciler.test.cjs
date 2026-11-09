require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DataSource } = require('typeorm');
const { SolicitudSuscripcion } = require('../dist/modules/solicitudes-suscripcion/infrastructure/solicitud.entity');
const { MensajeOutbox } = require('../dist/modules/solicitudes-suscripcion/infrastructure/outbox.entity');
const { RetryReconciler, scheduleRetry } = require('../dist/modules/solicitudes-suscripcion/infrastructure/retry-reconciler');

const now = Date.parse('2030-01-01T00:00:00Z');
const policy = { maxAttempts: 2, retryDelayMs: 10, staleAfterMs: 1000, now: () => now };
async function setup(t) {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities: [SolicitudSuscripcion, MensajeOutbox], synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  await db.getRepository(SolicitudSuscripcion).save({ id: 'request', tenantId: 'tenant', principalId: 'user', suscriptorId: 'sub', cajaMensualId: 'box', idempotencyKey: 'key', payloadHash: 'hash', precioConfirmado: '1.00', estado: 'pendiente' });
  await db.getRepository(SolicitudSuscripcion).update('request', { updatedAt: new Date(now - 10000) });
  await db.getRepository(MensajeOutbox).save({ id: 'message', solicitudId: 'request', tipo: 'subscription.requested', version: 1, contenido: JSON.stringify({ requestId: 'request', tenantId: 'tenant' }), estado: 'publicado', intentos: 0, publishedAt: now - 10000 });
  return db;
}

test('reconciler recovers a lost delivery once with the same message identity', async (t) => {
  const db = await setup(t);
  const reconciler = new RetryReconciler(db, policy);
  const result = await Promise.all([reconciler.runOnce(), reconciler.runOnce()]);
  assert.deepEqual(result.sort(), ['idle', 'scheduled']);
  const request = await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: 'request' });
  const message = await db.getRepository(MensajeOutbox).findOneByOrFail({ id: 'message' });
  assert.equal(request.intentosProcesamiento, 1);
  assert.equal(message.estado, 'pendiente');
  assert.equal(JSON.parse(message.contenido).attempt, 1);
  assert.equal(message.nextAttemptAt, now + 10);
});

test('does not retry old requests immediately after a new publication or before publication', async (t) => {
  const db = await setup(t);
  const messages = db.getRepository(MensajeOutbox);
  await messages.update('message', { publishedAt: now });
  assert.equal(await new RetryReconciler(db, policy).runOnce(), 'idle');
  await messages.update('message', { estado: 'pendiente', publishedAt: null });
  assert.equal(await new RetryReconciler(db, policy).runOnce(), 'idle');
  assert.equal((await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: 'request' })).intentosProcesamiento, 0);
});

test('a newer publication observed after candidate selection is not reconciled', async (t) => {
  const db = await setup(t);
  await db.getRepository(MensajeOutbox).update('message', { publishedAt: now });
  assert.equal(await scheduleRetry(db, 'request', 'message', 0, policy, new Date(now - 1000)), 'stale');
  assert.equal((await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: 'request' })).intentosProcesamiento, 0);
});

test('reconciler marks a repeatedly lost delivery failed and never reopens it', async (t) => {
  const db = await setup(t);
  await db.getRepository(SolicitudSuscripcion).update('request', { intentosProcesamiento: 1, updatedAt: new Date(now - 10000) });
  const reconciler = new RetryReconciler(db, policy);
  assert.equal(await reconciler.runOnce(), 'exhausted');
  assert.equal((await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: 'request' })).estado, 'fallido');
  assert.equal(await reconciler.runOnce(), 'idle');
});

test('failed retry transaction preserves original request and publication', async (t) => {
  const db = await setup(t);
  await db.query("CREATE TRIGGER fail_outbox_retry BEFORE UPDATE ON mensajes_outbox BEGIN SELECT RAISE(ABORT, 'failed'); END");
  await assert.rejects(new RetryReconciler(db, policy).runOnce());
  const request = await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: 'request' });
  assert.equal(request.estado, 'pendiente');
  assert.equal(request.intentosProcesamiento, 0);
  assert.equal((await db.getRepository(MensajeOutbox).findOneByOrFail({ id: 'message' })).estado, 'publicado');
});
