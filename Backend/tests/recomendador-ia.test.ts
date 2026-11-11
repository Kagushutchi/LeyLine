import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import type { DataSource } from 'typeorm';

let app: Application;
let dataSource: DataSource;
let envConfig: any;
let suscriptorTestId: string;
let cajaTestId: string;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_SQLITE_PATH = ':memory:';
  process.env.DB_SYNCHRONIZE = 'true';
  process.env.DB_LOGGING = 'false';
  process.env.SOAP_INVENTARIO_ENABLED = 'false';

  const envModule = await import('../src/config/env.config');
  envConfig = envModule.envConfig;

  const dbModule = await import('../src/config/database.config');
  dataSource = dbModule.AppDataSource;
  await dataSource.initialize();
  await dataSource.synchronize();

  const appModule = await import('../src/app');
  app = await appModule.createApp();

  const { Suscriptor } = await import('../src/modules/suscriptores/infrastructure/suscriptor.entity');
  const { Producto } = await import('../src/modules/productos/infrastructure/producto.entity');
  const { CajaMensual } = await import('../src/modules/cajas-mensuales/infrastructure/caja-mensual.entity');
  const { CajaMensualProducto } = await import('../src/modules/cajas-mensuales/infrastructure/caja-mensual-producto.entity');

  // Crear suscriptor con preferencias
  const suscriptorRepo = dataSource.getRepository(Suscriptor);
  const suscriptor = await suscriptorRepo.save(
    suscriptorRepo.create({
      nombre: 'Valentina',
      apellido: 'Rossi',
      email: 'valentina.test.ia@leyline.test',
      preferenciasOrganolepticas: {
        categoria: 'vinos',
        perfilSabor: ['frutos rojos', 'roble', 'vainilla'],
        intensidad: 'alta',
        alergiasRestricciones: ['sulfitos'],
        notasAdicionales: 'Prefiere vinos con crianza prolongada en barrica de roble francés.',
      },
      activo: true,
    })
  );
  suscriptorTestId = suscriptor.id;

  // Crear producto
  const productoRepo = dataSource.getRepository(Producto);
  const producto = await productoRepo.save(
    productoRepo.create({
      nombre: 'Gran Reserva Malbec 2020',
      categoria: 'vinos',
      tipo: 'Tinto',
      productor: 'Bodega Raíces de Cuyo',
      perfilNotas: ['frutos rojos', 'ciruela madura', 'vainilla', 'roble'],
      alergenosRestricciones: [],
      activo: true,
    })
  );

  // Crear caja mensual
  const cajaRepo = dataSource.getRepository(CajaMensual);
  const caja = await cajaRepo.save(
    cajaRepo.create({
      nombre: 'Selección Sommelier - Tintos de Guarda',
      categoria: 'vinos',
      mes: 11,
      anio: 2026,
      descripcion: 'Caja con vinos tintos de gran cuerpo y paso por roble',
      precioBase: 28500.0,
      disponible: true,
    })
  );
  cajaTestId = caja.id;

  // Crear composición
  const compRepo = dataSource.getRepository(CajaMensualProducto);
  await compRepo.save(
    compRepo.create({
      cajaMensualId: caja.id,
      productoId: producto.id,
      cantidad: 2,
      orden: 1,
    })
  );
});

afterAll(async () => {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
  vi.restoreAllMocks();
});

describe('Componente de IA: Recomendador de Cajas Mensuales (Google Gemini API)', () => {
  it('rechaza con 400 si falta el suscriptorId en el body', async () => {
    const res = await request(app).post('/api/cajas-mensuales/recomendar').send({});
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('devuelve 503 informativo si la API Key de Google Gemini no está configurada', async () => {
    // Guardar original
    const originalKey = envConfig.ai.googleApiKey;
    envConfig.ai.googleApiKey = '';

    const res = await request(app).post('/api/cajas-mensuales/recomendar').send({
      suscriptorId: suscriptorTestId,
    });

    expect(res.status).toBe(503);
    expect(res.body.message).toContain('GOOGLE_AI_API_KEY');

    // Restaurar
    envConfig.ai.googleApiKey = originalKey;
  });

  it('procesa y devuelve la recomendación de IA con mock de Google Gemini', async () => {
    envConfig.ai.googleApiKey = 'dummy-test-key';

    // Mockeamos el fetch global que usa RecommendCajaMensual
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  cajaId: cajaTestId,
                  cajaNombre: 'Selección Sommelier - Tintos de Guarda',
                  puntajeMatchPorcentaje: 95,
                  explicacion:
                    'Esta caja es ideal para Valentina porque contiene Gran Reserva Malbec 2020 con intensas notas a frutos rojos, vainilla y roble, coincidiendo al 95% con su preferencia organoléptica.',
                }),
              },
            ],
          },
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeminiResponse,
    } as any);

    const res = await request(app).post('/api/cajas-mensuales/recomendar').send({
      suscriptorId: suscriptorTestId,
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('cajaRecomendada');
    expect(res.body.data.cajaRecomendada.id).toBe(cajaTestId);
    expect(res.body.data.puntajeMatchPorcentaje).toBe(95);
    expect(res.body.data.explicacion).toContain('Valentina');
    expect(res.body.data.modeloIA).toBe(envConfig.ai.geminiModel);

    fetchSpy.mockRestore();
  });
});
