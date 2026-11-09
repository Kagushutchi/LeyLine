require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const { DataSource } = require('typeorm');
const { entities } = require('../dist/common/patterns/factory/entities');
const { User } = require('../dist/modules/auth/infrastructure/user.entity');
const { Suscriptor } = require('../dist/modules/suscriptores/infrastructure/suscriptor.entity');
const { CajaMensual } = require('../dist/modules/cajas-mensuales/infrastructure/caja-mensual.entity');
const { JwtUtils } = require('../dist/common/utils/jwt');
const { createSolicitudesRouter } = require('../dist/modules/solicitudes-suscripcion/presentation/solicitudes-router');

async function setup(t) {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  const subscribers = db.getRepository(Suscriptor);
  const first = await subscribers.save({ nombre: 'A', email: 'a@example.test' });
  const second = await subscribers.save({ nombre: 'B', email: 'b@example.test' });
  const users = db.getRepository(User);
  const a = await users.save({ username: 'a', email: 'a@example.test', password: 'test', role: 'subscriptor', suscriptorId: first.id });
  const b = await users.save({ username: 'b', email: 'b@example.test', password: 'test', role: 'subscriptor', suscriptorId: second.id });
  const admin = await users.save({ username: 'admin', email: 'admin@example.test', password: 'test', role: 'admin' });
  const box = await db.getRepository(CajaMensual).save({ nombre: 'Caja', categoria: 'vinos', mes: 1, anio: 2026, precioBase: 10, tenantId: 'tenant-1' });
  const router = createSolicitudesRouter(db);
  t.after(async () => { await db.destroy(); });
  const token = (user) => JwtUtils.generateAccessToken({ userId: user.id, username: user.username, email: user.email, role: user.role });
  const call = async (user, method, suffix = '', body, key = 'key-a') => {
    const headers = { ...(user ? { authorization: `Bearer ${token(user)}` } : {}), 'idempotency-key': key };
    const req = { headers, body, params: suffix ? { id: suffix.slice(1) } : {}, header(name) { return headers[name.toLowerCase()]; } };
    let status = 200, location, data;
    const res = { status(code) { status = code; return this; }, location(value) { location = value; return this; }, json(value) { data = value; return this; } };
    try {
      const middleware = router.stack.find((layer) => !layer.route).handle;
      middleware(req, res, (error) => { if (error) throw error; });
      const route = router.stack.find((layer) => layer.route && layer.route.methods[method.toLowerCase()] && layer.route.path === (suffix ? '/:id' : '/'));
      await route.route.stack[0].handle(req, res, (error) => { if (error) throw error; });
    } catch (error) { status = error.statusCode || 500; data = { message: error.message }; }
    return { status, headers: { get: () => location }, json: async () => data };
  };
  return { db, a, b, admin, box, call };
}

test('requires a linked active subscriber and scopes reads to their owner', async (t) => {
  const { db, a, b, admin, box, call } = await setup(t);
  const body = { cajaMensualId: box.id, precioConfirmadoCentavos: 1000 };
  assert.equal((await call(null, 'POST', '', body)).status, 401);
  assert.equal((await call(admin, 'POST', '', body)).status, 403);
  const created = await call(a, 'POST', '', body);
  assert.equal(created.status, 202);
  const result = (await created.json()).data;
  assert.equal(created.headers.get('location'), `/api/solicitudes-suscripcion/${result.id}`);
  assert.equal((await call(b, 'GET', `/${result.id}`)).status, 404);
  assert.equal((await call(a, 'GET', `/${result.id}`)).status, 200);
  assert.equal((await (await call(b, 'GET')).json()).data.length, 0);
  await db.getRepository(User).update(b.id, { suscriptorId: null });
  assert.equal((await call(b, 'POST', '', body)).status, 403);
  await db.getRepository(User).update(a.id, { activo: false });
  assert.equal((await call(a, 'GET')).status, 403);
});

test('replays accepted requests after price changes and rejects a changed payload', async (t) => {
  const { db, a, box, call } = await setup(t);
  const body = { cajaMensualId: box.id, precioConfirmadoCentavos: 1000 };
  const created = await call(a, 'POST', '', body);
  const first = (await created.json()).data;
  await db.getRepository(CajaMensual).update(box.id, { precioBase: 20, disponible: false });
  const replay = await call(a, 'POST', '', body);
  assert.equal(replay.status, 202);
  assert.equal((await replay.json()).data.id, first.id);
  const conflict = await call(a, 'POST', '', { ...body, precioConfirmadoCentavos: 2000 });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).code, 'IDEMPOTENCY_KEY_CONFLICT');
  assert.equal((await call(a, 'POST', '', { ...body, tenantId: 'forged' }, 'new-key')).status, 400);
});

test('rejects stale prices and boxes without tenants before acceptance', async (t) => {
  const { db, a, box, call } = await setup(t);
  const conflict = await call(a, 'POST', '', { cajaMensualId: box.id, precioConfirmadoCentavos: 900 });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).code, 'PRICE_CHANGED');
  await db.getRepository(CajaMensual).update(box.id, { tenantId: null });
  assert.equal((await call(a, 'POST', '', { cajaMensualId: box.id, precioConfirmadoCentavos: 1000 })).status, 404);
});
