const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { DataSource } = require('typeorm');
const { entities } = require('../dist/common/patterns/factory/entities');
const { User } = require('../dist/modules/auth/infrastructure/user.entity');
const { Suscriptor } = require('../dist/modules/suscriptores/infrastructure/suscriptor.entity');
const { LinkUsersToSuscriptores1796000000000 } = require('../dist/migrations/1796000000000-LinkUsersToSuscriptores');

// Isolate registration's transaction from JWT signing and application startup.
const appPath = require.resolve('../dist/app');
const jwtPath = require.resolve('../dist/common/utils/jwt');
require.cache[appPath] = { id: appPath, filename: appPath, loaded: true, exports: {} };
require.cache[jwtPath] = { id: jwtPath, filename: jwtPath, loaded: true, exports: { JwtUtils: {
  hashPassword: async () => 'test-hash',
  generateAccessToken: () => 'access',
  generateRefreshToken: () => 'refresh',
} } };
const RegisterSubscriptor = require('../dist/modules/auth/domain/useCase/register-subscriptor').default;
const dto = { email: 'customer@example.test', username: 'customer', nombre: 'Ana', apellido: 'Paz', password: 'password' };

async function makeDb(t) {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  return db;
}

test('registration atomically creates a durable unique account-subscriber link', async (t) => {
  const db = await makeDb(t);
  const result = await new RegisterSubscriptor(db).execute(dto);
  const user = await db.getRepository(User).findOneByOrFail({ id: result.user.id });
  const subscriber = await db.getRepository(Suscriptor).findOneByOrFail({ id: user.suscriptorId });
  assert.equal(subscriber.email, dto.email);
  assert.equal(user.refreshToken, 'refresh');
  await db.getRepository(Suscriptor).update(subscriber.id, { email: 'changed@example.test' });
  assert.equal((await db.getRepository(User).findOneByOrFail({ id: user.id })).suscriptorId, subscriber.id);
  await assert.rejects(db.getRepository(User).save({ username: 'other', email: 'other@example.test', password: 'x', suscriptorId: subscriber.id }));
});

test('existing subscriber email is not adopted and registration leaves no user', async (t) => {
  const db = await makeDb(t);
  const subscriber = await db.getRepository(Suscriptor).save({ nombre: 'Existing', email: dto.email });
  await assert.rejects(new RegisterSubscriptor(db).execute(dto), (error) => error.statusCode === 409);
  assert.equal(await db.getRepository(User).count(), 0);
  assert.equal((await db.getRepository(Suscriptor).findOneByOrFail({ id: subscriber.id })).nombre, 'Existing');
});

test('registration rolls back subscriber when user insertion fails', async (t) => {
  const db = await makeDb(t);
  await db.query(`CREATE TRIGGER reject_user BEFORE INSERT ON users BEGIN SELECT RAISE(ABORT, 'injected failure'); END`);
  await assert.rejects(new RegisterSubscriptor(db).execute(dto), /injected failure/);
  assert.equal(await db.getRepository(Suscriptor).count(), 0);
  assert.equal(await db.getRepository(User).count(), 0);
});

test('migration preserves legacy accounts unlinked, enforces uniqueness and guards destructive rollback', async (t) => {
  const db = new DataSource({ type: 'sqlite', database: ':memory:' });
  await db.initialize();
  t.after(() => db.destroy());
  const runner = db.createQueryRunner();
  t.after(() => runner.release());
  await runner.query('CREATE TABLE suscriptores (id varchar PRIMARY KEY, email varchar)');
  await runner.query('CREATE TABLE users (id varchar PRIMARY KEY, email varchar)');
  await runner.query("INSERT INTO suscriptores VALUES ('s1', 'same@example.test')");
  await runner.query("INSERT INTO users VALUES ('u1', 'same@example.test'), ('u2', 'other@example.test')");
  const migration = new LinkUsersToSuscriptores1796000000000();
  await migration.up(runner);
  assert.equal((await runner.query("SELECT suscriptorId FROM users WHERE id = 'u1'"))[0].suscriptorId, null);
  await runner.query("UPDATE users SET suscriptorId = 's1' WHERE id = 'u1'");
  await assert.rejects(runner.query("UPDATE users SET suscriptorId = 's1' WHERE id = 'u2'"));
  await assert.rejects(migration.down(runner), /while accounts are linked/);
  await runner.query('UPDATE users SET suscriptorId = NULL');
  await migration.down(runner);
  assert.equal((await runner.getTable('users')).findColumnByName('suscriptorId'), undefined);
});
