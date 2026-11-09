require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const { DataSource } = require('typeorm');
const { entities } = require('../dist/common/patterns/factory/entities');
const { setActiveDataSource } = require('../dist/config/database.config');
const { User } = require('../dist/modules/auth/infrastructure/user.entity');
const { Suscriptor } = require('../dist/modules/suscriptores/infrastructure/suscriptor.entity');
const { CajaMensual } = require('../dist/modules/cajas-mensuales/infrastructure/caja-mensual.entity');
const { Suscripcion } = require('../dist/modules/suscripciones/infrastructure/suscripcion.entity');
const { JwtUtils } = require('../dist/common/utils/jwt');
const { Tenant } = require('../dist/modules/auth/infrastructure/tenant.entity');
const router = require('../dist/modules/suscripciones/presentation/suscripciones-router').default;

async function setup(t) {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  setActiveDataSource(db);
  t.after(async () => { setActiveDataSource(null); await db.destroy(); });
  const t1 = await db.getRepository(Tenant).save({ nombre: 'T1', slug: 't1' });
  const t2 = await db.getRepository(Tenant).save({ nombre: 'T2', slug: 't2' });
  const subs = db.getRepository(Suscriptor);
  const s1 = await subs.save({ nombre: 'A', email: 'a@example.test' });
  const s2 = await subs.save({ nombre: 'B', email: 'b@example.test' });
  const users = db.getRepository(User);
  const u1 = await users.save({ username: 'a', email: 'a@example.test', password: 'x', role: 'subscriptor', suscriptorId: s1.id });
  const u2 = await users.save({ username: 'b', email: 'b@example.test', password: 'x', role: 'subscriptor', suscriptorId: s2.id });
  const admin1 = await users.save({ username: 'ad1', email: 'ad1@example.test', password: 'x', role: 'admin', tenantId: t1.id });
  const admin2 = await users.save({ username: 'ad2', email: 'ad2@example.test', password: 'x', role: 'admin', tenantId: t2.id });
  const box = await db.getRepository(CajaMensual).save({ nombre: 'Caja', categoria: 'vinos', mes: 1, anio: 2026, precioBase: 10, tenantId: t1.id });
  const token = (u) => JwtUtils.generateAccessToken({ userId: u.id, username: u.username, email: u.email, role: u.role, tenantId: u.tenantId });
  // Invokes the real route stack (auth middleware included) without a socket.
  const call = (user, method, path, body) => new Promise((resolve) => {
    const headers = user ? { authorization: `Bearer ${token(user)}` } : {};
    const req = { headers, body, method, url: path, params: {}, query: {}, header: (n) => headers[n.toLowerCase()] };
    const res = { status(c) { this.code = c; return this; }, json(v) { resolve({ status: this.code ?? 200, body: v }); return this; } };
    const layers = router.stack;
    const route = layers.find((l) => l.route && l.route.methods[method.toLowerCase()] && l.regexp.test(path) !== false && matches(l, path, req));
    const fail = (e) => resolve({ status: e.statusCode || 500, body: { message: e.message } });
    try {
      layers.find((l) => !l.route).handle(req, res, (e) => { if (e) throw e; });
      if (!route) return resolve({ status: 404 });
      // Run the route's whole middleware chain (validators first, handler last).
      const chain = route.route.stack.map((l) => l.handle);
      const step = (i) => (e) => { if (e) return fail(e); if (i < chain.length) { try { chain[i](req, res, step(i + 1)); } catch (x) { fail(x); } } };
      step(0)();
    } catch (e) { fail(e); }
  });
  function matches(layer, path, req) {
    const m = layer.regexp.exec(path);
    if (!m) return false;
    layer.keys.forEach((k, i) => { req.params[k.name] = decodeURIComponent(m[i + 1]); });
    return true;
  }
  return { t1, t2, db, s1, s2, u1, u2, admin1, admin2, box, call };
}

test('every legacy route requires authentication', async (t) => {
  const { call, s1 } = await setup(t);
  for (const [m, p] of [['GET', '/'], ['GET', `/cliente/${s1.id}`], ['GET', `/suscriptor/${s1.id}`], ['GET', '/x'], ['POST', '/'], ['PUT', '/x/pausar'], ['DELETE', '/x']]) {
    assert.equal((await call(null, m, p, {})).status, 401, `${m} ${p}`);
  }
});

test('subscribers create only for themselves with price and tenant taken from the box', async (t) => {
  const { db, t1, s1, u1, box, call } = await setup(t);
  const res = await call(u1, 'POST', '/', { cajaMensualId: box.id, suscriptorId: 'someone-else', tenantId: 'forged', montoMensual: 0.01 });
  assert.equal(res.status, 201);
  const row = await db.getRepository(Suscripcion).findOneBy({ id: res.body.data.id });
  assert.equal(row.suscriptorId, s1.id);
  assert.equal(row.tenantId, t1.id);
  assert.equal(Number(row.montoMensual), 10);
  assert.equal((await call(u1, 'POST', '/', { cajaMensualId: box.id })).status, 409);
});

test('tenant and ownership isolation on reads and mutations', async (t) => {
  const { db, s1, u1, u2, admin1, admin2, box, call } = await setup(t);
  const created = (await call(u1, 'POST', '/', { cajaMensualId: box.id })).body.data;
  assert.equal((await call(u2, 'GET', `/${created.id}`)).status, 404);
  assert.equal((await call(u2, 'PUT', `/${created.id}/pausar`)).status, 404);
  assert.equal((await call(u2, 'GET', `/cliente/${s1.id}`)).status, 403);
  assert.equal((await call(admin2, 'GET', `/${created.id}`)).status, 404);
  assert.equal((await call(admin2, 'DELETE', `/${created.id}`)).status, 404);
  assert.equal((await call(u1, 'DELETE', `/${created.id}`)).status, 403);
  assert.equal((await call(u1, 'PUT', `/${created.id}`, { montoMensual: 1 })).status, 403);
  assert.equal((await call(admin2, 'POST', '/', { cajaMensualId: box.id, suscriptorId: s1.id, montoMensual: 5 })).status, 404);
  assert.equal((await call(admin1, 'GET', '/')).body.data.length, 1);
  assert.equal((await call(admin2, 'GET', '/')).body.data.length, 0);
  assert.equal((await call(admin2, 'GET', `/cliente/${s1.id}`)).body.data.length, 0);
  assert.equal((await call(u1, 'PUT', `/${created.id}/pausar`)).status, 200);
  assert.equal((await call(admin1, 'DELETE', `/${created.id}`)).status, 200);
});
