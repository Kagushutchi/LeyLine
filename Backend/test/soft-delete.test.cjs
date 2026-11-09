const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { DataSource } = require('typeorm');
const BaseTypeORM = require('../dist/common/classes/base-typeorm-repository').default;
const { entities } = require('../dist/common/patterns/factory/entities');
const { Producto } = require('../dist/modules/productos/infrastructure/producto.entity');
const { CajaMensual } = require('../dist/modules/cajas-mensuales/infrastructure/caja-mensual.entity');
const { CajaMensualProducto } = require('../dist/modules/cajas-mensuales/infrastructure/caja-mensual-producto.entity');

class ProductRepository extends BaseTypeORM {
  constructor(repository) { super(repository); }
}

test('soft deletes are retained and excluded from normal reads and updates', async (t) => {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  const product = db.getRepository(Producto);
  const repo = new ProductRepository(product);
  const saved = await repo.save(product.create({ nombre: 'Test', categoria: 'vinos', tipo: 'tinto', productor: 'Test' }));
  await repo.delete(saved.id);
  assert.equal(await repo.findOneById(saved.id), null);
  assert.deepEqual(await repo.findAll(), []);
  assert.ok((await product.findOne({ where: { id: saved.id }, withDeleted: true })).deletedAt instanceof Date);
  await assert.rejects(repo.update(saved.id, { nombre: 'Changed' }));
});

test('replacing box contents soft deletes orphaned compositions', async (t) => {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  const product = await db.getRepository(Producto).save({ nombre: 'Test', categoria: 'vinos', tipo: 'tinto', productor: 'Test' });
  const boxes = db.getRepository(CajaMensual);
  const box = await boxes.save({ nombre: 'Test', categoria: 'vinos', mes: 1, anio: 2026, precioBase: 100, composiciones: [{ productoId: product.id, cantidad: 1 }] });
  const loaded = await boxes.findOne({ where: { id: box.id }, relations: { composiciones: true } });
  loaded.composiciones = [];
  await boxes.save(loaded);
  const compositions = db.getRepository(CajaMensualProducto);
  assert.equal(await compositions.count(), 0);
  const deleted = await compositions.find({ withDeleted: true });
  assert.equal(deleted.length, 1);
  assert.ok(deleted[0].deletedAt instanceof Date);
});

test('migration preserves existing deletion columns and safely rolls back', async (t) => {
  const db = new DataSource({ type: 'sqlite', database: ':memory:' });
  await db.initialize();
  t.after(() => db.destroy());
  const runner = db.createQueryRunner();
  const tables = ['suscriptores', 'productos', 'suscripciones', 'cajas_mensuales', 'cajas_mensuales_productos'];
  for (const table of tables) await runner.query(`CREATE TABLE "${table}" (id varchar PRIMARY KEY)`);
  await runner.query('ALTER TABLE \"productos\" ADD COLUMN \"deletedAt\" datetime');
  await runner.query("INSERT INTO productos (id, deletedAt) VALUES ('existing', '2026-01-01')");
  const { AddSoftDelete1794000000000 } = require('../dist/migrations/1794000000000-AddSoftDelete');
  const migration = new AddSoftDelete1794000000000();
  await migration.up(runner);
  for (const table of tables) assert.equal((await runner.getTable(table)).findColumnByName('deletedAt').isNullable, true);
  await migration.down(runner);
  for (const table of tables) assert.ok((await runner.getTable(table)).findColumnByName('deletedAt'));
  assert.equal((await runner.query("SELECT deletedAt FROM productos WHERE id = 'existing'"))[0].deletedAt, '2026-01-01');
  await runner.release();
});

test('repositories retain deleted related records but exclude deleted roots and compositions', async (t) => {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  const { Suscriptor } = require('../dist/modules/suscriptores/infrastructure/suscriptor.entity');
  const { Suscripcion } = require('../dist/modules/suscripciones/infrastructure/suscripcion.entity');
  const { SuscripcionRepository } = require('../dist/modules/suscripciones/infrastructure/suscripcion-repository');
  const { CajaMensualRepository } = require('../dist/modules/cajas-mensuales/infrastructure/caja-mensual-repository');
  const { ProductoRepository } = require('../dist/modules/productos/infrastructure/producto-repository');
  const products = db.getRepository(Producto);
  const boxes = db.getRepository(CajaMensual);
  const subscribers = db.getRepository(Suscriptor);
  const subscriptions = db.getRepository(Suscripcion);
  const product = await products.save({ nombre: 'Deleted', categoria: 'vinos', tipo: 'tinto', productor: 'Test' });
  const activeProduct = await products.save({ nombre: 'Active', categoria: 'vinos', tipo: 'tinto', productor: 'Test' });
  const box = await boxes.save({ nombre: 'Test', categoria: 'vinos', mes: 1, anio: 2026, precioBase: 100, composiciones: [{ productoId: product.id, cantidad: 1 }, { productoId: activeProduct.id, cantidad: 1 }] });
  const subscriber = await subscribers.save({ nombre: 'Test', email: 'test@example.com' });
  const subscription = await subscriptions.save({ suscriptorId: subscriber.id, cajaMensualId: box.id, categoria: 'vinos', montoMensual: 100 });
  const comps = db.getRepository(CajaMensualProducto);
  const removedComp = await comps.findOneBy({ cajaMensualId: box.id, productoId: activeProduct.id });
  await comps.softRemove(removedComp);
  await products.softDelete(product.id);
  const boxRepo = new CajaMensualRepository(db);
  const productRepo = new ProductoRepository(db);
  const subscriptionRepo = new SuscripcionRepository(db);
  for (const loaded of [await boxRepo.findOneById(box.id), ...(await boxRepo.findAll()), ...(await boxRepo.findByMesAnio(1, 2026))]) {
    assert.equal(loaded.composiciones.length, 1);
    assert.equal(loaded.composiciones[0].producto.id, product.id);
    assert.ok(loaded.composiciones[0].producto.deletedAt);
  }
  assert.equal(await productRepo.findOneById(product.id), null);
  assert.equal((await productRepo.findAll()).length, 1);
  const liveComp = await comps.save({ cajaMensualId: box.id, productoId: activeProduct.id, cantidad: 1 });
  await boxes.softDelete(box.id);
  await subscribers.softDelete(subscriber.id);
  for (const loaded of [await subscriptionRepo.findOneById(subscription.id), ...(await subscriptionRepo.findAll()), ...(await subscriptionRepo.findBySuscriptorId(subscriber.id))]) {
    assert.equal(loaded.suscriptor.id, subscriber.id);
    assert.ok(loaded.suscriptor.deletedAt);
    assert.equal(loaded.cajaMensual.id, box.id);
    assert.ok(loaded.cajaMensual.deletedAt);
    assert.equal(loaded.cajaMensual.composiciones.length, 2);
    assert.ok(loaded.cajaMensual.composiciones.every(c => c.producto));
  }
  const loadedProduct = await productRepo.findOneById(activeProduct.id);
  assert.equal(loadedProduct.composiciones.length, 1);
  assert.equal(loadedProduct.composiciones[0].id, liveComp.id);
  assert.equal(loadedProduct.composiciones[0].cajaMensual.id, box.id);
  assert.equal(await boxRepo.findOneById(box.id), null);
  assert.deepEqual(await boxRepo.findAll(), []);
  await subscriptions.softDelete(subscription.id);
  assert.equal(await subscriptionRepo.findOneById(subscription.id), null);
  assert.deepEqual(await subscriptionRepo.findAll(), []);
  assert.deepEqual(await subscriptionRepo.findBySuscriptorId(subscriber.id), []);
});

test('subscription updates reject deleted references and accept active replacements', async (t) => {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  const { setActiveDataSource } = require('../dist/config/database.config');
  setActiveDataSource(db);
  t.after(() => setActiveDataSource(null));
  const { Suscriptor } = require('../dist/modules/suscriptores/infrastructure/suscriptor.entity');
  const { Suscripcion } = require('../dist/modules/suscripciones/infrastructure/suscripcion.entity');
  const UpdateSuscripcion = require('../dist/modules/suscripciones/domain/useCase/update-suscripcion').default;
  const subscribers = db.getRepository(Suscriptor);
  const boxes = db.getRepository(CajaMensual);
  const originalSubscriber = await subscribers.save({ nombre: 'Original', email: 'original@example.com' });
  const inactiveSubscriber = await subscribers.save({ nombre: 'Deleted', email: 'deleted@example.com' });
  const activeSubscriber = await subscribers.save({ nombre: 'Active', email: 'active@example.com' });
  const originalBox = await boxes.save({ nombre: 'Original', categoria: 'vinos', mes: 1, anio: 2026, precioBase: 100 });
  const inactiveBox = await boxes.save({ nombre: 'Deleted', categoria: 'vinos', mes: 2, anio: 2026, precioBase: 100 });
  const activeBox = await boxes.save({ nombre: 'Active', categoria: 'vinos', mes: 3, anio: 2026, precioBase: 100 });
  const subscription = await db.getRepository(Suscripcion).save({ suscriptorId: originalSubscriber.id, cajaMensualId: originalBox.id, categoria: 'vinos', montoMensual: 100 });
  await subscribers.softDelete(inactiveSubscriber.id);
  await boxes.softDelete(inactiveBox.id);
  const update = new UpdateSuscripcion();
  await assert.rejects(update.execute(subscription.id, { suscriptorId: inactiveSubscriber.id }), /no encontrado/);
  await assert.rejects(update.execute(subscription.id, { cajaMensualId: inactiveBox.id }), /no encontrada/);
  await update.execute(subscription.id, { suscriptorId: activeSubscriber.id, cajaMensualId: activeBox.id, deletedAt: new Date() });
  const actual = await db.getRepository(Suscripcion).findOneBy({ id: subscription.id });
  assert.equal(actual.suscriptorId, activeSubscriber.id);
  assert.equal(actual.cajaMensualId, activeBox.id);
  assert.equal(actual.deletedAt, null);
});

test('create and update payloads cannot modify deletion timestamps', async (t) => {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  const { setActiveDataSource } = require('../dist/config/database.config');
  setActiveDataSource(db);
  t.after(() => setActiveDataSource(null));
  const CreateProducto = require('../dist/modules/productos/domain/useCase/create-producto').default;
  const UpdateProducto = require('../dist/modules/productos/domain/useCase/update-producto').default;
  const CreateSuscriptor = require('../dist/modules/suscriptores/domain/useCase/create-suscriptores').default;
  const UpdateSuscriptor = require('../dist/modules/suscriptores/domain/useCase/update-suscriptor').default;
  const CreateCaja = require('../dist/modules/cajas-mensuales/domain/useCase/create-caja-mensual').default;
  const UpdateCaja = require('../dist/modules/cajas-mensuales/domain/useCase/update-caja-mensual').default;
  const { Suscriptor } = require('../dist/modules/suscriptores/infrastructure/suscriptor.entity');
  const fakeDeletion = new Date('2025-01-01');
  const product = await new CreateProducto().execute({ nombre: 'P', categoria: 'vinos', tipo: 'tinto', productor: 'P', deletedAt: fakeDeletion });
  const subscriber = await new CreateSuscriptor().execute({ nombre: 'S', email: 's@example.com', deletedAt: fakeDeletion });
  const box = await new CreateCaja().execute({ nombre: 'C', categoria: 'vinos', mes: 1, anio: 2026, deletedAt: fakeDeletion });
  assert.equal((await db.getRepository(Producto).findOneBy({ id: product.id })).deletedAt, null);
  assert.equal((await db.getRepository(Suscriptor).findOneBy({ id: subscriber.id })).deletedAt, null);
  assert.equal((await db.getRepository(CajaMensual).findOneBy({ id: box.id })).deletedAt, null);
  await new UpdateProducto().execute(product.id, { nombre: 'P2', deletedAt: fakeDeletion });
  await new UpdateSuscriptor().execute(subscriber.id, { nombre: 'S2', deletedAt: fakeDeletion });
  await new UpdateCaja().execute(box.id, { nombre: 'C2', deletedAt: fakeDeletion });
  assert.equal((await db.getRepository(Producto).findOneBy({ id: product.id })).nombre, 'P2');
  assert.equal((await db.getRepository(Suscriptor).findOneBy({ id: subscriber.id })).nombre, 'S2');
  assert.equal((await db.getRepository(CajaMensual).findOneBy({ id: box.id })).nombre, 'C2');
  const repo = new ProductRepository(db.getRepository(Producto));
  await repo.delete(product.id);
  await assert.rejects(repo.update(product.id, { deletedAt: null }));
  assert.ok((await db.getRepository(Producto).findOne({ where: { id: product.id }, withDeleted: true })).deletedAt);
});

test('repeated delete and unknown ids leave other records and deletion timestamp unchanged', async (t) => {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  const products = db.getRepository(Producto);
  const repo = new ProductRepository(products);
  const a = await products.save({ nombre: 'A', categoria: 'vinos', tipo: 'tinto', productor: 'P' });
  const b = await products.save({ nombre: 'B', categoria: 'vinos', tipo: 'tinto', productor: 'P' });
  await repo.delete(a.id);
  const first = (await products.findOne({ where: { id: a.id }, withDeleted: true })).deletedAt.getTime();
  await assert.rejects(repo.delete(a.id));
  await assert.rejects(repo.delete('missing'));
  assert.equal((await products.findOne({ where: { id: a.id }, withDeleted: true })).deletedAt.getTime(), first);
  assert.deepEqual((await repo.findAll()).map(p => p.id), [b.id]);
  assert.equal(await products.count({ withDeleted: true }), 2);
});

test('replacing box products repeatedly preserves deleted history and rejects inactive products atomically', async (t) => {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  const { setActiveDataSource } = require('../dist/config/database.config');
  setActiveDataSource(db);
  t.after(() => setActiveDataSource(null));
  const UpdateCaja = require('../dist/modules/cajas-mensuales/domain/useCase/update-caja-mensual').default;
  const CajaRepo = require('../dist/modules/cajas-mensuales/infrastructure/caja-mensual-repository').CajaMensualRepository;
  const products = db.getRepository(Producto);
  const p1 = await products.save({ nombre: 'A', categoria: 'vinos', tipo: 'tinto', productor: 'P' });
  const p2 = await products.save({ nombre: 'B', categoria: 'vinos', tipo: 'tinto', productor: 'P' });
  const box = await db.getRepository(CajaMensual).save({ nombre: 'Caja', categoria: 'vinos', mes: 1, anio: 2026, precioBase: 1, composiciones: [{ productoId: p1.id, cantidad: 1 }] });
  const update = new UpdateCaja();
  await update.execute(box.id, { composiciones: [{ productoId: p2.id, cantidad: 2 }] });
  await update.execute(box.id, { composiciones: [{ productoId: p1.id, cantidad: 3 }] });
  const all = await db.getRepository(CajaMensualProducto).find({ where: { cajaMensualId: box.id }, withDeleted: true });
  assert.equal(all.length, 3);
  assert.equal(all.filter(c => c.deletedAt).length, 2);
  let loaded = await new CajaRepo(db).findOneById(box.id);
  assert.deepEqual(loaded.composiciones.map(c => [c.productoId, c.cantidad]), [[p1.id, 3]]);
  await products.softDelete(p2.id);
  await assert.rejects(update.execute(box.id, { nombre: 'No guardar', composiciones: [{ productoId: p2.id, cantidad: 1 }] }), /no encontrado/);
  await assert.rejects(update.execute(box.id, { composiciones: [{ productoId: p1.id, cantidad: 1 }, { productoId: p1.id, cantidad: 1 }] }), /repetirse/);
  loaded = await new CajaRepo(db).findOneById(box.id);
  assert.equal(loaded.nombre, 'Caja');
  assert.deepEqual(loaded.composiciones.map(c => [c.productoId, c.cantidad]), [[p1.id, 3]]);
  assert.equal(await db.getRepository(CajaMensualProducto).count({ withDeleted: true }), 3);
});

test('creating subscriptions rejects deleted and missing references without creating rows', async (t) => {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  const { setActiveDataSource } = require('../dist/config/database.config');
  setActiveDataSource(db);
  t.after(() => setActiveDataSource(null));
  const { Suscriptor } = require('../dist/modules/suscriptores/infrastructure/suscriptor.entity');
  const { Suscripcion } = require('../dist/modules/suscripciones/infrastructure/suscripcion.entity');
  const Create = require('../dist/modules/suscripciones/domain/useCase/create-suscripcion').default;
  const subscriber = await db.getRepository(Suscriptor).save({ nombre: 'S', email: 's@example.com' });
  const box = await db.getRepository(CajaMensual).save({ nombre: 'C', categoria: 'vinos', mes: 1, anio: 2026, precioBase: 1 });
  const create = new Create();
  const payload = { suscriptorId: subscriber.id, cajaMensualId: box.id, montoMensual: 1 };
  await assert.rejects(create.execute({ ...payload, suscriptorId: 'missing' }), /no encontrado/);
  await assert.rejects(create.execute({ ...payload, cajaMensualId: 'missing' }), /no encontrada/);
  await db.getRepository(Suscriptor).softDelete(subscriber.id);
  await assert.rejects(create.execute(payload), /no encontrado/);
  await db.getRepository(Suscriptor).restore(subscriber.id);
  await db.getRepository(CajaMensual).softDelete(box.id);
  await assert.rejects(create.execute(payload), /no encontrada/);
  assert.equal(await db.getRepository(Suscripcion).count({ withDeleted: true }), 0);
});

test('updates cannot target a deleted row by injecting its id in the payload', async (t) => {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  const { setActiveDataSource } = require('../dist/config/database.config');
  setActiveDataSource(db);
  t.after(() => setActiveDataSource(null));
  const UpdateProducto = require('../dist/modules/productos/domain/useCase/update-producto').default;
  const products = db.getRepository(Producto);
  const deleted = await products.save({ nombre: 'Eliminado', categoria: 'vinos', tipo: 'tinto', productor: 'P' });
  const active = await products.save({ nombre: 'Activo', categoria: 'vinos', tipo: 'tinto', productor: 'P' });
  await products.softDelete(deleted.id);
  await new UpdateProducto().execute(active.id, { id: deleted.id, nombre: 'Modificado' });
  const old = await products.findOne({ where: { id: deleted.id }, withDeleted: true });
  assert.ok(old.deletedAt);
  assert.equal(old.nombre, 'Eliminado');
  assert.equal((await products.findOneBy({ id: active.id })).nombre, 'Modificado');
});

test('injected ids cannot restore deleted subscribers, boxes or products through create and update', async (t) => {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  const { setActiveDataSource } = require('../dist/config/database.config');
  setActiveDataSource(db);
  t.after(() => setActiveDataSource(null));
  const { Suscriptor } = require('../dist/modules/suscriptores/infrastructure/suscriptor.entity');
  const CreateProducto = require('../dist/modules/productos/domain/useCase/create-producto').default;
  const CreateSuscriptor = require('../dist/modules/suscriptores/domain/useCase/create-suscriptores').default;
  const UpdateSuscriptor = require('../dist/modules/suscriptores/domain/useCase/update-suscriptor').default;
  const UpdateCaja = require('../dist/modules/cajas-mensuales/domain/useCase/update-caja-mensual').default;
  const products = db.getRepository(Producto), subscribers = db.getRepository(Suscriptor), boxes = db.getRepository(CajaMensual);
  const product = await products.save({ nombre: 'Viejo', categoria: 'vinos', tipo: 'tinto', productor: 'P' });
  const subscriber = await subscribers.save({ nombre: 'Viejo', email: 'old@example.com' });
  const activeSubscriber = await subscribers.save({ nombre: 'Activo', email: 'active@example.com' });
  const box = await boxes.save({ nombre: 'Vieja', categoria: 'vinos', mes: 1, anio: 2026, precioBase: 1 });
  const activeBox = await boxes.save({ nombre: 'Activa', categoria: 'vinos', mes: 2, anio: 2026, precioBase: 1 });
  await products.softDelete(product.id);
  await subscribers.softDelete(subscriber.id);
  await boxes.softDelete(box.id);
  const newProduct = await new CreateProducto().execute({ id: product.id, nombre: 'Nuevo', categoria: 'vinos', tipo: 'tinto', productor: 'P' });
  const newSubscriber = await new CreateSuscriptor().execute({ id: subscriber.id, nombre: 'Nuevo', email: 'new@example.com' });
  assert.notEqual(newProduct.id, product.id);
  assert.notEqual(newSubscriber.id, subscriber.id);
  await new UpdateSuscriptor().execute(activeSubscriber.id, { id: subscriber.id, nombre: 'Actualizado' });
  await new UpdateCaja().execute(activeBox.id, { id: box.id, nombre: 'Actualizada' });
  for (const [repo, entity] of [[products, product], [subscribers, subscriber], [boxes, box]]) {
    const original = await repo.findOne({ where: { id: entity.id }, withDeleted: true });
    assert.ok(original.deletedAt);
    assert.equal(original.nombre, entity.nombre);
  }
  assert.equal((await subscribers.findOneBy({ id: activeSubscriber.id })).nombre, 'Actualizado');
  assert.equal((await boxes.findOneBy({ id: activeBox.id })).nombre, 'Actualizada');
});
