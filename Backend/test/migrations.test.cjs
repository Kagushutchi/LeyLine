require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { DataSource } = require('typeorm');
const { entities } = require('../dist/common/patterns/factory/entities');

// The pre-existing chain assumes a pre-built schema, so build it with sync, drop the
// queue tables/indexes and exercise only the queue migrations on top.
test('queue migrations apply, enforce uniqueness, refuse unsafe data and revert', async (t) => {
  const dir = path.join(__dirname, '../dist/migrations');
  const db = new DataSource({
    type: 'sqlite', database: ':memory:', entities, synchronize: true,
    migrations: [path.join(dir, '1797000000000-*.js'), path.join(dir, '1798000000000-*.js')],
  });
  await db.initialize();
  t.after(async () => { await db.destroy(); });
  for (const table of ['mensajes_inbox', 'mensajes_outbox', 'solicitudes_suscripcion']) await db.query(`DROP TABLE "${table}"`);
  await db.runMigrations({ transaction: 'each' });
  const names = (await db.query(`SELECT name FROM sqlite_master WHERE type='index'`)).map((r) => r.name);
  for (const n of ['uq_solicitud_idempotencia', 'uq_outbox_solicitud', 'uq_inbox_consumidor_mensaje', 'uq_suscripcion_viva']) assert.ok(names.includes(n), n);

  await db.query(`PRAGMA foreign_keys = OFF`);
  const row = (id, estado) => db.query(
    `INSERT INTO suscripciones (id, suscriptorId, cajaMensualId, categoria, estado, montoMensual) VALUES (?, 's', 'c', 'vinos', ?, 10)`, [id, estado]);
  await row('1', 'activa');
  await assert.rejects(row('2', 'pausada'), /UNIQUE/);
  await row('3', 'cancelada');

  await db.undoLastMigration({ transaction: 'each' });
  await row('2', 'pausada'); // now allowed: duplicate live data exists
  await db.undoLastMigration({ transaction: 'each' }); // empty tables: revert allowed
  // Re-applying the uniqueness migration must refuse to run over duplicate data.
  await db.query(`CREATE TABLE IF NOT EXISTS keep (x int)`);
  const { UniqueLiveSubscription1798000000000: M } = require(path.join(dir, '1798000000000-UniqueLiveSubscription.js'));
  await assert.rejects(new M().up(db.createQueryRunner()), /duplicate live subscriptions/);
});
