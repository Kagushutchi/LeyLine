require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DataSource } = require('typeorm');
const { SolicitudSuscripcion } = require('../dist/modules/solicitudes-suscripcion/infrastructure/solicitud.entity');
const { MensajeOutbox } = require('../dist/modules/solicitudes-suscripcion/infrastructure/outbox.entity');
const { MensajeInbox } = require('../dist/modules/solicitudes-suscripcion/infrastructure/inbox.entity');
const { AceptarSolicitud } = require('../dist/modules/solicitudes-suscripcion/domain/aceptar-solicitud');
const { AddSubscriptionRequests1797000000000 } = require('../dist/migrations/1797000000000-AddSubscriptionRequests');
const { AddPaymentProvider1800000000000 } = require('../dist/migrations/1800000000000-AddPaymentProvider');
const { entities } = require('../dist/common/patterns/factory/entities');
const { CajaMensual } = require('../dist/modules/cajas-mensuales/infrastructure/caja-mensual.entity');

const payload = { principalId: 'user-a', suscriptorId: 'subscriber-a', cajaMensualId: 'box-a', idempotencyKey: 'request-key', precioConfirmadoCentavos: 10000 };
async function seedBoxes(db) {
  const boxes = db.getRepository(CajaMensual);
  for (const [id, tenantId] of [['box-a', 'tenant-a'], ['box-b', 'tenant-b']]) {
    await boxes.save({ id, tenantId, nombre: 'Caja', categoria: 'vinos', mes: 1, anio: 2026, precioBase: 100 });
  }
}
async function setup(t) {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities: entities.filter(e => ![SolicitudSuscripcion, MensajeOutbox, MensajeInbox].includes(e)), synchronize: true });
  db.setOptions({ entities });
  await db.initialize();
  const runner = db.createQueryRunner();
  // Business entities use sync in this isolated database; request tables use the real migration.
  await runner.dropTable('mensajes_inbox');
  await runner.dropTable('mensajes_outbox');
  await runner.dropTable('solicitudes_suscripcion');
  await new AddSubscriptionRequests1797000000000().up(runner);
  await new AddPaymentProvider1800000000000().up(runner);
  await seedBoxes(db);
  t.after(async () => { await runner.release(); await db.destroy(); });
  return { db, runner, service: new AceptarSolicitud(db) };
}

test('concurrent retries persist one request and one message and conflicting payload is rejected', async (t) => {
  const { db, service } = await setup(t);
  const [first, second] = await Promise.all([service.execute(payload), service.execute({ ...payload })]);
  assert.equal(first.id, second.id);
  assert.equal(await db.getRepository(SolicitudSuscripcion).count(), 1);
  const messages = await db.getRepository(MensajeOutbox).find();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].solicitudId, first.id);
  assert.deepEqual(JSON.parse(messages[0].contenido), { requestId: first.id, tenantId: 'tenant-a' });
  await assert.rejects(service.execute({ ...payload, cajaMensualId: 'other' }), (error) => error.statusCode === 409 && error.code === 'IDEMPOTENCY_KEY_CONFLICT');
  assert.equal(await db.getRepository(SolicitudSuscripcion).count(), 1);
});

test('idempotency keys are scoped by principal and reject another box', async (t) => {
  const { db, service } = await setup(t);
  const requests = await Promise.all([
    service.execute(payload), service.execute({ ...payload, principalId: 'user-b', cajaMensualId: 'box-b' }),
  ]);
  assert.equal(new Set(requests.map((item) => item.id)).size, 2);
  assert.equal(await db.getRepository(MensajeOutbox).count(), 2);
  await assert.rejects(service.execute({ ...payload, cajaMensualId: 'box-b' }), (error) => error.statusCode === 409);
});

test('concurrent clients on separate SQLite connections converge on the same request', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'subscription-request-test-'));
  const options = { type: 'sqlite', database: path.join(dir, 'test.sqlite'), entities, synchronize: true };
  const first = new DataSource(options);
  const second = new DataSource(options);
  await first.initialize();
  await second.initialize();
  t.after(async () => { await first.destroy(); await second.destroy(); await fs.rm(dir, { recursive: true, force: true }); });
  await seedBoxes(first);
  const [a, b] = await Promise.all([new AceptarSolicitud(first).execute(payload), new AceptarSolicitud(second).execute(payload)]);
  assert.equal(a.id, b.id);
  assert.equal(await first.getRepository(SolicitudSuscripcion).count(), 1);
  assert.equal(await first.getRepository(MensajeOutbox).count(), 1);
});

test('outbox insertion failure rolls back request and migration down removes tables', async (t) => {
  const { db, runner, service } = await setup(t);
  await db.query("CREATE TRIGGER fail_outbox BEFORE INSERT ON mensajes_outbox BEGIN SELECT RAISE(ABORT, 'failed'); END");
  await assert.rejects(service.execute(payload));
  assert.equal(await db.getRepository(SolicitudSuscripcion).count(), 0);
  assert.equal(await db.getRepository(MensajeOutbox).count(), 0);
  await new AddSubscriptionRequests1797000000000().down(runner);
  assert.equal(await runner.hasTable('solicitudes_suscripcion'), false);
  assert.equal(await runner.hasTable('mensajes_outbox'), false);
  assert.equal(await runner.hasTable('mensajes_inbox'), false);
});

test('price snapshot is server-checked and remains stable after a price change', async (t) => {
  const { db, service } = await setup(t);
  await assert.rejects(service.execute({ ...payload, precioConfirmadoCentavos: 9999 }), (error) => error.statusCode === 409 && error.code === 'PRICE_CHANGED');
  const request = await service.execute(payload);
  assert.equal(Number(request.precioConfirmado), 100);
  await db.getRepository(CajaMensual).update('box-a', { precioBase: 120, disponible: false });
  assert.equal((await service.execute(payload)).id, request.id);
  await assert.rejects(service.execute({ ...payload, precioConfirmadoCentavos: 12000 }), (error) => error.statusCode === 409);
});

test('migration rollback preserves accepted requests and related records', async (t) => {
  const { db, runner, service } = await setup(t);
  await service.execute(payload);
  await assert.rejects(new AddSubscriptionRequests1797000000000().down(runner), /while records exist/);
  assert.equal(await db.getRepository(SolicitudSuscripcion).count(), 1);
  assert.equal(await db.getRepository(MensajeOutbox).count(), 1);
});
