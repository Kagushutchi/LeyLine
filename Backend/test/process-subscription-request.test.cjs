require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DataSource } = require('typeorm');
const { entities } = require('../dist/common/patterns/factory/entities');
const { User } = require('../dist/modules/auth/infrastructure/user.entity');
const { Suscriptor } = require('../dist/modules/suscriptores/infrastructure/suscriptor.entity');
const { CajaMensual } = require('../dist/modules/cajas-mensuales/infrastructure/caja-mensual.entity');
const { Suscripcion } = require('../dist/modules/suscripciones/infrastructure/suscripcion.entity');
const { MensajeInbox } = require('../dist/modules/solicitudes-suscripcion/infrastructure/inbox.entity');
const { MensajeOutbox } = require('../dist/modules/solicitudes-suscripcion/infrastructure/outbox.entity');
const { SolicitudSuscripcion } = require('../dist/modules/solicitudes-suscripcion/infrastructure/solicitud.entity');
const { AceptarSolicitud } = require('../dist/modules/solicitudes-suscripcion/domain/aceptar-solicitud');
const { ProcesarSolicitud } = require('../dist/modules/solicitudes-suscripcion/domain/procesar-solicitud');

async function setup(t) {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  const subscriber = await db.getRepository(Suscriptor).save({ nombre: 'Test', email: 'person@example.test', activo: true });
  const user = await db.getRepository(User).save({ username: 'person', email: 'person@example.test', password: 'hash', role: 'subscriptor', suscriptorId: subscriber.id });
  const box = await db.getRepository(CajaMensual).save({ nombre: 'Caja', categoria: 'vinos', mes: 1, anio: 2026, precioBase: 100, tenantId: 'tenant-a' });
  const request = await new AceptarSolicitud(db).execute({ principalId: user.id, suscriptorId: subscriber.id, cajaMensualId: box.id, idempotencyKey: 'key', precioConfirmadoCentavos: 10000 });
  const outbox = await db.getRepository(MensajeOutbox).findOneByOrFail({ solicitudId: request.id });
  return { db, request, user, subscriber, box, processor: new ProcesarSolicitud(db), message: {
    messageId: outbox.id, requestId: request.id, tenantId: 'tenant-a', type: outbox.tipo, version: 1, correlationId: request.id, payload: {},
  } };
}

test('duplicate deliveries create one subscription using accepted price snapshot', async (t) => {
  const { db, request, box, processor, message } = await setup(t);
  await db.getRepository(CajaMensual).update(box.id, { precioBase: 200 });
  const results = await Promise.all([processor.execute(message), processor.execute(message)]);
  assert.deepEqual(results, ['ack', 'ack']);
  const subscriptions = await db.getRepository(Suscripcion).find();
  assert.equal(subscriptions.length, 1);
  assert.equal(Number(subscriptions[0].montoMensual), 100);
  assert.equal((await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: request.id })).estado, 'completado');
  assert.equal(await db.getRepository(MensajeInbox).count(), 1);
});

test('failure after business insert rolls back effect and leaves message retryable', async (t) => {
  const { db, request, processor, message } = await setup(t);
  await db.query("CREATE TRIGGER fail_inbox BEFORE INSERT ON mensajes_inbox BEGIN SELECT RAISE(ABORT, 'failed'); END");
  assert.equal(await processor.execute(message), 'ack');
  assert.equal(await db.getRepository(Suscripcion).count(), 0);
  assert.equal(await db.getRepository(MensajeInbox).count(), 0);
  assert.equal((await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: request.id })).estado, 'pendiente');
  await db.query('DROP TRIGGER fail_inbox');
  assert.equal(await processor.execute({ ...message, payload: { attempt: 1 } }), 'ack');
  assert.equal(await db.getRepository(Suscripcion).count(), 1);
});

test('untrusted tenant or message identity does not change request', async (t) => {
  const { db, request, processor, message } = await setup(t);
  assert.equal(await processor.execute({ ...message, tenantId: 'other' }), 'reject');
  assert.equal(await processor.execute({ ...message, messageId: 'fake' }), 'reject');
  assert.equal((await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: request.id })).estado, 'pendiente');
  assert.equal(await db.getRepository(Suscripcion).count(), 0);
});

test('revoked account-subscriber link rejects without subscription', async (t) => {
  const { db, request, user, processor, message } = await setup(t);
  await db.getRepository(User).update(user.id, { suscriptorId: null });
  assert.equal(await processor.execute(message), 'ack');
  assert.equal((await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: request.id })).estado, 'rechazado');
  assert.equal(await db.getRepository(Suscripcion).count(), 0);
});

test('box moved to another tenant is rejected without subscription', async (t) => {
  const { db, request, box, processor, message } = await setup(t);
  await db.getRepository(CajaMensual).update(box.id, { tenantId: 'other' });
  assert.equal(await processor.execute(message), 'ack');
  assert.equal((await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: request.id })).estado, 'rechazado');
  assert.equal(await db.getRepository(Suscripcion).count(), 0);
});

test('duplicate failures spend one attempt and exhaustion reaches failed state', async (t) => {
  const { db, request, processor, message } = await setup(t);
  await db.query("CREATE TRIGGER fail_inbox BEFORE INSERT ON mensajes_inbox BEGIN SELECT RAISE(ABORT, 'failed'); END");
  assert.deepEqual(await Promise.all([processor.execute(message), processor.execute(message)]), ['ack', 'ack']);
  let row = await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: request.id });
  assert.equal(row.intentosProcesamiento, 1);
  let outbox = await db.getRepository(MensajeOutbox).findOneByOrFail({ solicitudId: request.id });
  assert.equal(JSON.parse(outbox.contenido).attempt, 1);
  assert.equal(await processor.execute({ ...message, payload: { attempt: 1 } }), 'ack');
  assert.equal(await processor.execute({ ...message, payload: { attempt: 2 } }), 'reject');
  row = await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: request.id });
  assert.equal(row.estado, 'fallido');
  assert.equal(row.intentosProcesamiento, 3);
  assert.equal(await processor.execute(message), 'ack');
  assert.equal(await db.getRepository(Suscripcion).count(), 0);
});

test('retry scheduling database failure is not acknowledged', async (t) => {
  const { db, request, processor, message } = await setup(t);
  await db.query("CREATE TRIGGER fail_inbox BEFORE INSERT ON mensajes_inbox BEGIN SELECT RAISE(ABORT, 'failed'); END");
  await db.query("CREATE TRIGGER fail_retry BEFORE UPDATE OF intentosProcesamiento ON solicitudes_suscripcion BEGIN SELECT RAISE(ABORT, 'failed'); END");
  assert.equal(await processor.execute(message), 'retry');
  const row = await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: request.id });
  assert.equal(row.estado, 'pendiente');
  assert.equal(row.intentosProcesamiento, 0);
});

test('acceptance and processing transactions share one SQLite serialization queue', async (t) => {
  const { db, user, subscriber, box, processor, message } = await setup(t);
  const request = { principalId: user.id, suscriptorId: subscriber.id, cajaMensualId: box.id, idempotencyKey: 'other', precioConfirmadoCentavos: 10000 };
  const [outcome, accepted] = await Promise.all([processor.execute(message),
    new AceptarSolicitud(db).execute(request).then((value) => ({ value }), (error) => ({ error }))]);
  assert.equal(outcome, 'ack');
  // Same subscriber and box: the business rule rejects it cleanly (never a lock error).
  assert.equal(accepted.error.statusCode, 409);
  assert.ok(['REQUEST_IN_PROGRESS', 'ALREADY_SUBSCRIBED'].includes(accepted.error.code));
  assert.equal(await db.getRepository(Suscripcion).count(), 1);
});
