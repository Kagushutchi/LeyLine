require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const { DataSource } = require('typeorm');
const { entities } = require('../dist/common/patterns/factory/entities');
const { User } = require('../dist/modules/auth/infrastructure/user.entity');
const { Tenant } = require('../dist/modules/auth/infrastructure/tenant.entity');
const { Suscriptor } = require('../dist/modules/suscriptores/infrastructure/suscriptor.entity');
const { CajaMensual } = require('../dist/modules/cajas-mensuales/infrastructure/caja-mensual.entity');
const { Suscripcion } = require('../dist/modules/suscripciones/infrastructure/suscripcion.entity');
const { SolicitudSuscripcion } = require('../dist/modules/solicitudes-suscripcion/infrastructure/solicitud.entity');
const { MensajeOutbox } = require('../dist/modules/solicitudes-suscripcion/infrastructure/outbox.entity');
const { AceptarSolicitud } = require('../dist/modules/solicitudes-suscripcion/domain/aceptar-solicitud');
const { ProcesarSolicitud } = require('../dist/modules/solicitudes-suscripcion/domain/procesar-solicitud');
const { collectQueueStats, replayFailedRequest } = require('../dist/modules/solicitudes-suscripcion/infrastructure/queue-ops');

async function setup(t) {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(async () => { await db.destroy(); });
  const tenant = await db.getRepository(Tenant).save({ nombre: 'T', slug: 't' });
  const sub = await db.getRepository(Suscriptor).save({ nombre: 'A', email: 'a@example.test' });
  const user = await db.getRepository(User).save({ username: 'a', email: 'a@example.test', password: 'x', role: 'subscriptor', suscriptorId: sub.id });
  const box = await db.getRepository(CajaMensual).save({ nombre: 'Caja', categoria: 'vinos', mes: 1, anio: 2026, precioBase: 10, tenantId: tenant.id });
  const input = (key) => ({ principalId: user.id, suscriptorId: sub.id, cajaMensualId: box.id, idempotencyKey: key, precioConfirmadoCentavos: 1000 });
  return { db, tenant, sub, user, box, input };
}
const envelope = async (db, request) => {
  const m = await db.getRepository(MensajeOutbox).findOneBy({ solicitudId: request.id });
  return { messageId: m.id, type: m.tipo, version: m.version, requestId: request.id, tenantId: request.tenantId, payload: JSON.parse(m.contenido) };
};

test('a second key for the same box is rejected while a request is in progress or a subscription is live', async (t) => {
  const { db, input } = await setup(t);
  const accept = new AceptarSolicitud(db);
  const first = await accept.execute(input('k1'));
  await assert.rejects(accept.execute(input('k2')), (e) => e.code === 'REQUEST_IN_PROGRESS' && e.statusCode === 409);
  assert.equal((await accept.execute(input('k1'))).id, first.id);
  assert.equal(await new ProcesarSolicitud(db).execute(await envelope(db, first)), 'ack');
  assert.equal((await db.getRepository(SolicitudSuscripcion).findOneBy({ id: first.id })).estado, 'completado');
  await assert.rejects(accept.execute(input('k3')), (e) => e.code === 'ALREADY_SUBSCRIBED');
  await db.getRepository(Suscripcion).createQueryBuilder().update().set({ estado: 'cancelada' }).execute();
  assert.ok((await accept.execute(input('k3'))).id);
});

test('worker rejects a request when a live subscription appeared meanwhile', async (t) => {
  const { db, sub, box, tenant, input } = await setup(t);
  const request = await new AceptarSolicitud(db).execute(input('k1'));
  await db.getRepository(Suscripcion).save({ suscriptorId: sub.id, cajaMensualId: box.id, tenantId: tenant.id, categoria: 'vinos', montoMensual: 10, estado: 'activa', fechaInicio: new Date(), proximoCobro: new Date() });
  assert.equal(await new ProcesarSolicitud(db).execute(await envelope(db, request)), 'ack');
  assert.equal((await db.getRepository(SolicitudSuscripcion).findOneBy({ id: request.id })).estado, 'rechazado');
  assert.equal(await db.getRepository(Suscripcion).count(), 1);
});

test('stats expose counts and ages only; replay requeues only failed requests with an operator', async (t) => {
  const { db, input } = await setup(t);
  const request = await new AceptarSolicitud(db).execute(input('k1'));
  const stats = await collectQueueStats(db, Date.now() + 5000);
  assert.equal(stats.requestsByState.pendiente, 1);
  assert.equal(stats.outboxPending, 1);
  assert.ok(stats.oldestPendingOutboxAgeMs >= 4000);
  assert.equal(JSON.stringify(stats).includes(request.id), false);
  await assert.rejects(replayFailedRequest(db, request.id, 'ops'), /Only failed/);
  await db.getRepository(SolicitudSuscripcion).update(request.id, { estado: 'fallido', intentosProcesamiento: 3 });
  await db.getRepository(MensajeOutbox).update({ solicitudId: request.id }, { estado: 'publicado', publishedAt: 1, contenido: JSON.stringify({ requestId: request.id, tenantId: request.tenantId, attempt: 2 }) });
  await assert.rejects(replayFailedRequest(db, request.id, ' '), /Operator/);
  const write = process.stdout.write; let audit = '';
  process.stdout.write = (c) => { audit += c; return true; };
  try { await replayFailedRequest(db, request.id, 'ops'); } finally { process.stdout.write = write; }
  assert.match(audit, /request\.replayed/);
  const after = await db.getRepository(SolicitudSuscripcion).findOneBy({ id: request.id });
  assert.deepEqual([after.estado, after.intentosProcesamiento], ['pendiente', 0]);
  const msg = await db.getRepository(MensajeOutbox).findOneBy({ solicitudId: request.id });
  assert.equal(msg.estado, 'pendiente');
  assert.equal('attempt' in JSON.parse(msg.contenido), false);
  assert.equal(await new ProcesarSolicitud(db).execute(await envelope(db, after)), 'ack');
  assert.equal((await db.getRepository(SolicitudSuscripcion).findOneBy({ id: request.id })).estado, 'completado');
});
