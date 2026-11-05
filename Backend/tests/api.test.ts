import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import type { DataSource } from 'typeorm';

let app: Application;
let dataSource: DataSource;
let inventarioProductoId: string;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_SQLITE_PATH = ':memory:';
  process.env.DB_SYNCHRONIZE = 'true';
  process.env.DB_LOGGING = 'false';
  process.env.SOAP_INVENTARIO_ENABLED = 'false';

  const dbModule = await import('../src/config/database.config');
  dataSource = dbModule.AppDataSource;
  await dataSource.initialize();
  await dataSource.synchronize();

  const appModule = await import('../src/app');
  app = await appModule.createApp();

  const { Producto } = await import('../src/modules/productos/infrastructure/producto.entity');
  const { StockProducto } = await import('../src/modules/inventario/infrastructure/stock-producto.entity');

  const productoRepo = dataSource.getRepository(Producto);
  const producto = await productoRepo.save(
    productoRepo.create({
      nombre: 'Producto de prueba SOAP',
      categoria: 'vinos',
      tipo: 'Tinto',
      productor: 'Bodega Test',
      precioReferencia: 100,
    })
  );

  const stockRepo = dataSource.getRepository(StockProducto);
  await stockRepo.save(
    stockRepo.create({
      productoId: producto.id,
      productor: producto.productor,
      cantidadDisponible: 10,
      cantidadReservada: 0,
    })
  );

  inventarioProductoId = producto.id;
});

afterAll(async () => {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
});

describe('API base', () => {
  it('responde el healthcheck con la base conectada', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.databaseConnected).toBe(true);
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('rechaza un body inválido con 400', async () => {
    const response = await request(app).post('/api/suscriptores').send({ nombre: 'Sin email' });

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('error');
  });

  it('rechaza un UUID inválido en params con 400', async () => {
    const response = await request(app).get('/api/productos/no-es-uuid');

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('error');
  });

  it('crea y recupera un suscriptor', async () => {
    const email = `test-${Date.now()}@leyline.test`;
    const created = await request(app)
      .post('/api/suscriptores')
      .send({ nombre: 'Ada', apellido: 'Lovelace', email });

    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const fetched = await request(app).get(`/api/suscriptores/${id}`);

    expect(fetched.status).toBe(200);
    expect(fetched.body.data.email).toBe(email);
  });

  it('devuelve 409 ante un email duplicado', async () => {
    const email = `duplicado-${Date.now()}@leyline.test`;
    await request(app).post('/api/suscriptores').send({ nombre: 'Uno', email });

    const response = await request(app).post('/api/suscriptores').send({ nombre: 'Dos', email });

    expect(response.status).toBe(409);
  });
});

describe('Contratos OpenAPI y SOAP', () => {
  it('expone el documento OpenAPI con los endpoints REST', async () => {
    const response = await request(app).get('/api/docs.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
    expect(Object.keys(response.body.paths)).toContain('/api/productos');
    expect(Object.keys(response.body.paths)).toContain('/api/suscripciones/{id}/pausar');
  });

  it('sirve Swagger UI en /api/docs', async () => {
    const response = await request(app).get('/api/docs/');

    expect(response.status).toBe(200);
    expect(response.text.toLowerCase()).toContain('swagger');
  });

  it('consulta el inventario por SOAP', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:inv="http://leyline.com/soap/inventario">
  <soap:Body>
    <inv:consultarInventario>
      <inv:productoId>${inventarioProductoId}</inv:productoId>
    </inv:consultarInventario>
  </soap:Body>
</soap:Envelope>`;

    const response = await request(app)
      .post('/soap/inventario')
      .set('Content-Type', 'text/xml; charset=utf-8')
      .set('SOAPAction', 'consultarInventario')
      .send(xml);

    expect(response.status).toBe(200);
    expect(response.text).toContain('<cantidadDisponible>10</cantidadDisponible>');
    expect(response.text).toContain('Bodega Test');
  });

  it('reserva stock por SOAP y descuenta disponible', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:inv="http://leyline.com/soap/inventario">
  <soap:Body>
    <inv:reservarStock>
      <inv:productoId>${inventarioProductoId}</inv:productoId>
      <inv:cantidad>3</inv:cantidad>
    </inv:reservarStock>
  </soap:Body>
</soap:Envelope>`;

    const response = await request(app)
      .post('/soap/inventario')
      .set('Content-Type', 'text/xml; charset=utf-8')
      .set('SOAPAction', 'reservarStock')
      .send(xml);

    expect(response.status).toBe(200);
    expect(response.text).toContain('<exito>true</exito>');
    expect(response.text).toContain('<cantidadDisponible>7</cantidadDisponible>');
    expect(response.text).toContain('<cantidadReservada>3</cantidadReservada>');
  });
});
