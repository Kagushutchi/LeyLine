import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import type { DataSource } from 'typeorm';

let app: Application;
let dataSource: DataSource;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_SQLITE_PATH = ':memory:';
  process.env.DB_SYNCHRONIZE = 'true';
  process.env.DB_LOGGING = 'false';

  const dbModule = await import('../src/config/database.config');
  dataSource = dbModule.AppDataSource;
  await dataSource.initialize();
  await dataSource.synchronize();

  const appModule = await import('../src/app');
  app = await appModule.createApp();
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
