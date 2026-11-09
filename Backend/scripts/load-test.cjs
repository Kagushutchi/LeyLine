/* Load test against REAL PostgreSQL + RabbitMQ (docker compose up -d postgres rabbitmq).
 * Usage: node scripts/load-test.cjs [N=500] [workers=1]   (needs `npm run build` first)
 * Creates and drops its own database `leyline_load`; never touches your data. */
require('reflect-metadata');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { DataSource } = require('typeorm');
const root = path.join(__dirname, '..');
const { entities } = require(path.join(root, 'dist/common/patterns/factory/entities'));
const { JwtUtils } = require(path.join(root, 'dist/common/utils/jwt'));
const LIVE = process.argv[4] === 'live'; // worker already running while requests arrive
const N = Number(process.argv[2] || 500), WORKERS = Number(process.argv[3] || 1), DB = 'leyline_load';
const pg = { type: 'postgres', host: 'localhost', port: 5432, username: 'postgres', password: 'postgres' };
const env = { ...process.env, DB_TYPE: 'postgres', DB_HOST: 'localhost', DB_PORT: '5432', DB_USERNAME: 'postgres', DB_PASSWORD: 'postgres', DB_DATABASE: DB,
  PORT: '3996', SUBSCRIPTION_REQUESTS_ENABLED: 'true', QUEUE_RUNTIME_ENABLED: 'true',
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://clubcurator:change-me-local-only@localhost:5672' };
let retries = 0;
// A burst of hundreds of simultaneous connections can overflow the OS accept backlog
// (macOS somaxconn=128) and be reset; clients simply retry. POSTs are safe to retry
// because they carry an Idempotency-Key.
const rf = async (url, init) => { for (let a = 0; ; a++) { try { return await fetch(url, init); } catch (e) { if (a >= 4) throw e; retries++; await new Promise((r) => setTimeout(r, 30 * (a + 1))); } } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd) => execSync(cmd, { stdio: 'pipe' }).toString();
const procs = [];
const start = (file, extra = {}) => { const p = spawn('node', [path.join(root, 'dist', file)], { env: { ...env, ...extra }, cwd: root }); p.stderr.on('data', (d) => { if (process.env.DEBUG_LOAD) process.stderr.write(d); }); p.stdout.on('data', (d) => { if (process.env.DEBUG_LOAD) process.stderr.write(d); }); procs.push(p); return p; };
const stopAll = async () => { await Promise.all(procs.map((p) => new Promise((r) => { if (p.exitCode !== null) return r(); p.once('exit', r); p.kill('SIGTERM'); setTimeout(() => p.kill('SIGKILL'), 5000); }))); };

(async () => {
  const admin = new DataSource({ ...pg, database: 'postgres' }); await admin.initialize();
  await admin.query(`DROP DATABASE IF EXISTS ${DB}`); await admin.query(`CREATE DATABASE ${DB}`);
  // 1) schema through the app's own startup, 2) queue tables through the real migrations
  const boot = start('server.js', { PORT: '3995' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch('http://localhost:3995/api/health')).ok) break; } catch {} await sleep(250); }
  await stopAll(); procs.length = 0;
  const db = new DataSource({ ...pg, database: DB, entities, synchronize: false,
    migrations: [path.join(root, 'dist/migrations/1797000000000-*.js'), path.join(root, 'dist/migrations/1798000000000-*.js')] });
  await db.initialize();
  for (const t of ['mensajes_inbox', 'mensajes_outbox', 'solicitudes_suscripcion']) await db.query(`DROP TABLE "${t}"`);
  await db.query(`DROP INDEX IF EXISTS "uq_suscripcion_viva"`); await db.runMigrations({ transaction: 'each' });

  const tenant = (await db.query(`INSERT INTO tenants (nombre, slug) VALUES ('L','l') RETURNING id`))[0].id;
  await db.query(`INSERT INTO suscriptores (nombre, email, "tenantId") SELECT 'S'||g, 'ls'||g||'@e.test', $1 FROM generate_series(1,$2) g`, [tenant, N]);
  await db.query(`INSERT INTO users (username, email, password, role, "suscriptorId") SELECT 'lu'||s.email, s.email, 'x', 'subscriptor', s.id FROM suscriptores s WHERE s.email LIKE 'ls%@e.test'`);
  const box = (await db.query(`INSERT INTO cajas_mensuales (nombre, categoria, mes, anio, "precioBase", "tenantId") VALUES ('C','vinos',1,2026,10,$1) RETURNING id`, [tenant]))[0].id;
  const users = await db.query(`SELECT id FROM users WHERE username LIKE 'lu%'`);
  const tokens = users.map((u) => JwtUtils.generateAccessToken({ userId: u.id, username: 'u', email: 'e@e.test', role: 'subscriptor' }));

  const api = start('server.js');
  for (let i = 0; i < 60; i++) { try { if ((await fetch('http://localhost:3996/api/health')).ok) break; } catch {} await sleep(250); }
  const post = (token, i) => fetch('http://localhost:3996/api/solicitudes-suscripcion', { method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': `load-${i}` },
    body: JSON.stringify({ cajaMensualId: box, precioConfirmadoCentavos: 1000 }) }).then((r) => r.status).catch(() => 0);

  if (LIVE) {
    for (let w = 0; w < WORKERS; w++) start('workers/queue-worker.js');
    await sleep(2500); // let the worker(s) connect
    // N users click at (almost) the same time; each waits for its own result via long-poll
    const lats = [];
    const one = async (i) => {
      const t = Date.now();
      const r = await rf('http://localhost:3996/api/solicitudes-suscripcion', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${tokens[i]}`, 'idempotency-key': `live-${i}` }, body: JSON.stringify({ cajaMensualId: box, precioConfirmadoCentavos: 1000 }) });
      const id = (await r.json()).data.id;
      let st = 'pendiente';
      for (let k = 0; k < 3 && !['completado', 'rechazado', 'fallido'].includes(st); k++) {
        st = (await (await rf(`http://localhost:3996/api/solicitudes-suscripcion/${id}?waitMs=4000`, { headers: { authorization: `Bearer ${tokens[i]}` } })).json()).data.estado;
      }
      lats.push(Date.now() - t); return st;
    };
    const t0 = Date.now();
    const states = await Promise.all(Array.from({ length: N }, (_, i) => one(i)));
    lats.sort((a, b) => a - b);
    const q = (p) => lats[Math.min(lats.length - 1, Math.floor(lats.length * p))];
    const subs = (await db.query(`SELECT count(*)::int c FROM suscripciones`))[0].c;
    console.log(`LIVE ${N} usuarios simultáneos, ${WORKERS} worker(s): total ${Date.now() - t0} ms | espera por usuario ms: min ${lats[0]}  p50 ${q(0.5)}  p95 ${q(0.95)}  max ${lats[lats.length - 1]}`);
    console.log(`reintentos por conexión reseteada=${retries} estados=${JSON.stringify(states.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {}))} suscripciones=${subs}`, subs === N ? 'RESULT OK' : 'RESULT MISMATCH');
    await stopAll(); await db.destroy(); await admin.query(`DROP DATABASE ${DB}`); await admin.destroy(); return;
  }

  // Phase A: accept N requests with the worker OFF (API throughput + backlog)
  let t0 = Date.now(), next = 0; const codes = {};
  await Promise.all(Array.from({ length: 50 }, async () => { while (next < N) { const i = next++; const c = await post(tokens[i], i); codes[c] = (codes[c] || 0) + 1; } }));
  const acceptMs = Date.now() - t0;
  console.log(`ACCEPT  ${N} pedidos en ${acceptMs} ms  (${(N / (acceptMs / 1000)).toFixed(0)} req/s)  códigos=${JSON.stringify(codes)}`);

  // Phase B: start worker(s), measure time to drain
  t0 = Date.now();
  for (let w = 0; w < WORKERS; w++) start('workers/queue-worker.js');
  let counts;
  for (;;) {
    counts = Object.fromEntries((await db.query(`SELECT estado, count(*)::int c FROM solicitudes_suscripcion GROUP BY estado`)).map((r) => [r.estado, r.c]));
    if ((counts.completado || 0) + (counts.rechazado || 0) + (counts.fallido || 0) >= N || Date.now() - t0 > 600000) break;
    await sleep(500);
  }
  const drainMs = Date.now() - t0;
  const subs = (await db.query(`SELECT count(*)::int c FROM suscripciones`))[0].c;
  console.log(`PROCESS ${N} pedidos en ${drainMs} ms  (${(N / (drainMs / 1000)).toFixed(0)} pedidos/s) workers=${WORKERS} estados=${JSON.stringify(counts)} suscripciones=${subs}`);
  console.log(subs === N && counts.completado === N ? 'RESULT OK' : 'RESULT MISMATCH');

  // Phase C: steady-state latency (worker warm, single request)
  const lat = [];
  for (let k = 0; k < 5; k++) {
    const s = (await db.query(`INSERT INTO suscriptores (nombre, email, "tenantId") VALUES ('X','x${k}@e.test',$1) RETURNING id`, [tenant]))[0].id;
    const u = (await db.query(`INSERT INTO users (username, email, password, role, "suscriptorId") VALUES ('x${k}','x${k}@e.test','x','subscriptor',$1) RETURNING id`, [s]))[0].id;
    const tk = JwtUtils.generateAccessToken({ userId: u, username: 'u', email: 'e@e.test', role: 'subscriptor' });
    const s0 = Date.now();
    const r = await fetch('http://localhost:3996/api/solicitudes-suscripcion', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${tk}`, 'idempotency-key': `lat-${k}` }, body: JSON.stringify({ cajaMensualId: box, precioConfirmadoCentavos: 1000 }) });
    const id = (await r.json()).data.id;
    const w = await fetch(`http://localhost:3996/api/solicitudes-suscripcion/${id}?waitMs=4000`, { headers: { authorization: `Bearer ${tk}` } });
    const st = (await w.json()).data.estado; if (st !== 'completado') console.log('unexpected state', st);
    lat.push(Date.now() - s0);
  }
  console.log(`LATENCIA click→completado, POST + long-poll (ms): ${lat.join(', ')}`);
  await stopAll(); await db.destroy();
  await admin.query(`DROP DATABASE ${DB}`); await admin.destroy();
})().catch(async (e) => { console.error('ERROR', e.message, e.cause && (e.cause.code || e.cause.message)); await stopAll(); process.exit(1); });
