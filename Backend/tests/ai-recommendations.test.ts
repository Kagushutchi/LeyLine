import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataSource } from 'typeorm';

// El cliente de DeepSeek usa axios por debajo; lo mockeamos una sola vez para
// todo el archivo y nunca tocamos la red real, ni siquiera por accidente.
vi.mock('axios', () => {
  const post = vi.fn();
  const isAxiosError = vi.fn((error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError));
  return { default: { post, isAxiosError } };
});

let dataSource: DataSource;
let axiosPost: ReturnType<typeof vi.fn>;

function respuestaDeepSeek(contenido: unknown) {
  return {
    data: {
      choices: [{ message: { content: typeof contenido === 'string' ? contenido : JSON.stringify(contenido) } }],
    },
  };
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_SQLITE_PATH = ':memory:';
  process.env.DB_SYNCHRONIZE = 'true';
  process.env.DB_LOGGING = 'false';
  process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';

  const dbModule = await import('../src/config/database.config');
  dataSource = dbModule.AppDataSource;
  await dataSource.initialize();
  await dataSource.synchronize();

  const axios = (await import('axios')).default as unknown as { post: ReturnType<typeof vi.fn> };
  axiosPost = axios.post;
});

afterAll(async () => {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
});

afterEach(() => {
  axiosPost.mockReset();
});

// El DataSource es compartido por todo el archivo (una sola vez en beforeAll), así que sin
// esto las filas de un test quedan visibles para el siguiente — por ejemplo, una CajaMensual
// creada en un test anterior hacía que "no hay cajas disponibles" dejara de ser cierto.
beforeEach(async () => {
  const { CajaMensualProducto } = await import('../src/modules/cajas-mensuales/infrastructure/caja-mensual-producto.entity');
  const { CajaMensual } = await import('../src/modules/cajas-mensuales/infrastructure/caja-mensual.entity');
  const { Producto } = await import('../src/modules/productos/infrastructure/producto.entity');
  const { Suscriptor } = await import('../src/modules/suscriptores/infrastructure/suscriptor.entity');

  await dataSource.getRepository(CajaMensualProducto).clear();
  await dataSource.getRepository(CajaMensual).clear();
  await dataSource.getRepository(Producto).clear();
  await dataSource.getRepository(Suscriptor).clear();
});

/** Siembra un suscriptor, un producto de vinos activo y, opcionalmente, una caja mensual con ese producto. */
async function seedEscenarioVinos(opts: { conCaja?: boolean } = {}) {
  const { Suscriptor } = await import('../src/modules/suscriptores/infrastructure/suscriptor.entity');
  const { Producto } = await import('../src/modules/productos/infrastructure/producto.entity');
  const { CajaMensual } = await import('../src/modules/cajas-mensuales/infrastructure/caja-mensual.entity');
  const { CajaMensualProducto } = await import('../src/modules/cajas-mensuales/infrastructure/caja-mensual-producto.entity');

  const suscriptor = await dataSource.getRepository(Suscriptor).save(
    dataSource.getRepository(Suscriptor).create({
      nombre: 'Ana',
      apellido: 'Test',
      email: `ana-${Date.now()}-${Math.random()}@leyline.test`,
      preferenciasOrganolepticas: { categoria: 'vinos', perfilSabor: ['robusto'], alergiasRestricciones: [] },
    })
  );

  const producto = await dataSource.getRepository(Producto).save(
    dataSource.getRepository(Producto).create({
      nombre: 'Malbec de Prueba',
      categoria: 'vinos',
      tipo: 'Tinto',
      productor: 'Bodega Test',
      precioReferencia: 1000,
      activo: true,
    })
  );

  let caja: InstanceType<typeof CajaMensual> | undefined;
  if (opts.conCaja) {
    caja = await dataSource.getRepository(CajaMensual).save(
      dataSource.getRepository(CajaMensual).create({
        nombre: 'Caja Vinos de Prueba',
        categoria: 'vinos',
        mes: 1,
        anio: 2027,
        precioBase: 1000,
        disponible: true,
      })
    );
    await dataSource.getRepository(CajaMensualProducto).save(
      dataSource.getRepository(CajaMensualProducto).create({
        cajaMensualId: caja.id,
        productoId: producto.id,
        cantidad: 1,
      })
    );
  }

  return { suscriptor, producto, caja };
}

describe('DeepSeekRecommendationClient', () => {
  it('parsea JSON devuelto limpio, sin bloques de markdown', async () => {
    const { DeepSeekRecommendationClient } = await import('../src/modules/cajas-mensuales/client/deepseek-recommendation-client');
    axiosPost.mockResolvedValueOnce(respuestaDeepSeek({ nombre: 'Caja X', descripcion: 'd', composiciones: [] }));

    const resultado = await new DeepSeekRecommendationClient().generarJson('prompt', 'clave');

    expect(resultado).toEqual({ nombre: 'Caja X', descripcion: 'd', composiciones: [] });
  });

  it('pela los ```json ... ``` que el modelo agrega a veces', async () => {
    const { DeepSeekRecommendationClient } = await import('../src/modules/cajas-mensuales/client/deepseek-recommendation-client');
    axiosPost.mockResolvedValueOnce(
      respuestaDeepSeek('```json\n{"nombre":"Caja Y","descripcion":"d","composiciones":[]}\n```')
    );

    const resultado = await new DeepSeekRecommendationClient().generarJson('prompt', 'clave');

    expect(resultado).toEqual({ nombre: 'Caja Y', descripcion: 'd', composiciones: [] });
  });

  it('traduce un 401 del proveedor a un error claro sobre la API key', async () => {
    const { DeepSeekRecommendationClient } = await import('../src/modules/cajas-mensuales/client/deepseek-recommendation-client');
    const { AppError } = await import('../src/common/errors/app-error');
    axiosPost.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });

    await expect(new DeepSeekRecommendationClient().generarJson('prompt', 'clave-invalida')).rejects.toMatchObject({
      statusCode: 401,
    });
    await expect(new DeepSeekRecommendationClient().generarJson('prompt', 'clave-invalida')).rejects.toBeInstanceOf(AppError);
  });

  it('devuelve un 502 si el contenido no es JSON válido', async () => {
    const { DeepSeekRecommendationClient } = await import('../src/modules/cajas-mensuales/client/deepseek-recommendation-client');
    axiosPost.mockResolvedValueOnce(respuestaDeepSeek('esto no es json'));

    await expect(new DeepSeekRecommendationClient().generarJson('prompt', 'clave')).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it('devuelve un 502 si el proveedor no manda contenido', async () => {
    const { DeepSeekRecommendationClient } = await import('../src/modules/cajas-mensuales/client/deepseek-recommendation-client');
    axiosPost.mockResolvedValueOnce({ data: { choices: [] } });

    await expect(new DeepSeekRecommendationClient().generarJson('prompt', 'clave')).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it('generarRecomendacion rechaza una respuesta sin composiciones', async () => {
    const { DeepSeekRecommendationClient } = await import('../src/modules/cajas-mensuales/client/deepseek-recommendation-client');
    axiosPost.mockResolvedValueOnce(respuestaDeepSeek({ nombre: 'Caja Z', descripcion: 'd' }));

    await expect(new DeepSeekRecommendationClient().generarRecomendacion('prompt', 'clave')).rejects.toMatchObject({
      statusCode: 502,
    });
  });
});

describe('RecommendCajaMensual (recomendación personalizada por suscriptor)', () => {
  it('arma una caja usando la composición que devuelve el modelo', async () => {
    const { suscriptor, producto } = await seedEscenarioVinos();
    const RecommendCajaMensual = (await import('../src/modules/cajas-mensuales/domain/useCase/recommend-caja-mensual')).default;
    axiosPost.mockResolvedValueOnce(
      respuestaDeepSeek({ nombre: 'Caja Curada', descripcion: 'Elegida para tu perfil', composiciones: [{ productoId: producto.id, cantidad: 2 }] })
    );

    const resultado = await new RecommendCajaMensual().execute(suscriptor.id);

    expect(resultado.categoria).toBe('vinos');
    expect(resultado.composiciones).toHaveLength(1);
    expect(resultado.composiciones[0]).toMatchObject({ productoId: producto.id, cantidad: 2, precioAplicado: 1000 });
    expect(resultado.precioBase).toBe(2000);
  });

  it('ignora productos que el modelo inventó y no están en el catálogo', async () => {
    const { suscriptor, producto } = await seedEscenarioVinos();
    const RecommendCajaMensual = (await import('../src/modules/cajas-mensuales/domain/useCase/recommend-caja-mensual')).default;
    axiosPost.mockResolvedValueOnce(
      respuestaDeepSeek({
        nombre: 'Caja Curada',
        descripcion: 'd',
        composiciones: [
          { productoId: 'id-inexistente', cantidad: 1 },
          { productoId: producto.id, cantidad: 1 },
        ],
      })
    );

    const resultado = await new RecommendCajaMensual().execute(suscriptor.id);

    expect(resultado.composiciones).toHaveLength(1);
    expect(resultado.composiciones[0].productoId).toBe(producto.id);
  });

  it('responde 404 si el suscriptor no existe', async () => {
    const RecommendCajaMensual = (await import('../src/modules/cajas-mensuales/domain/useCase/recommend-caja-mensual')).default;

    await expect(new RecommendCajaMensual().execute('00000000-0000-0000-0000-000000000000')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(axiosPost).not.toHaveBeenCalled();
  });

  it('responde 404 si no hay productos activos en la categoría preferida', async () => {
    const { Suscriptor } = await import('../src/modules/suscriptores/infrastructure/suscriptor.entity');
    const suscriptor = await dataSource.getRepository(Suscriptor).save(
      dataSource.getRepository(Suscriptor).create({
        nombre: 'Bruno',
        email: `bruno-${Date.now()}@leyline.test`,
        preferenciasOrganolepticas: { categoria: 'cafes' },
      })
    );
    const RecommendCajaMensual = (await import('../src/modules/cajas-mensuales/domain/useCase/recommend-caja-mensual')).default;

    await expect(new RecommendCajaMensual().execute(suscriptor.id)).rejects.toMatchObject({ statusCode: 404 });
    expect(axiosPost).not.toHaveBeenCalled();
  });

  it('responde 400 si falta configurar DEEPSEEK_API_KEY', async () => {
    // envConfig.deepseek.apiKey se captura una sola vez de process.env al importar el módulo,
    // así que cambiar process.env después no alcanza. En vez de vi.resetModules() (que limpia
    // TODO el cache de módulos del archivo y rompe los tests siguientes: las entidades se
    // re-importan como clases nuevas que el DataSource ya inicializado no reconoce), mutamos
    // directamente el objeto — envConfig es un literal plano, no congelado — y lo restauramos.
    const { envConfig } = await import('../src/config/env.config');
    const RecommendCajaMensual = (await import('../src/modules/cajas-mensuales/domain/useCase/recommend-caja-mensual')).default;
    const previa = envConfig.deepseek.apiKey;
    envConfig.deepseek.apiKey = '';
    try {
      await expect(new RecommendCajaMensual().execute('cualquier-id')).rejects.toMatchObject({ statusCode: 400 });
    } finally {
      envConfig.deepseek.apiKey = previa;
    }
  });
});

describe('RecommendCajaMensualGeneral (recomendación agregada del club)', () => {
  it('prioriza la categoría más demandada entre los suscriptores', async () => {
    const { suscriptor, producto } = await seedEscenarioVinos();
    const RecommendCajaMensualGeneral = (await import('../src/modules/cajas-mensuales/domain/useCase/recommend-caja-mensual-general')).default;
    axiosPost.mockResolvedValueOnce(
      respuestaDeepSeek({ nombre: 'Caja del Club', descripcion: 'd', composiciones: [{ productoId: producto.id, cantidad: 1 }] })
    );

    const resultado = await new RecommendCajaMensualGeneral().execute(suscriptor.tenantId);

    expect(resultado.categoria).toBe('vinos');
    expect(resultado.composiciones[0].productoId).toBe(producto.id);
  });
});

describe('RecommendCajasExistentes (recomendación entre cajas ya creadas)', () => {
  it('devuelve solo las cajas que el modelo eligió, validadas contra el catálogo real', async () => {
    const { suscriptor, caja } = await seedEscenarioVinos({ conCaja: true });
    const RecommendCajasExistentes = (await import('../src/modules/cajas-mensuales/domain/useCase/recommend-cajas-existentes')).default;
    axiosPost.mockResolvedValueOnce(
      respuestaDeepSeek({
        recomendaciones: [
          { cajaMensualId: 'id-que-no-existe', motivo: 'inventado' },
          { cajaMensualId: caja!.id, motivo: 'coincide con su perfil' },
        ],
      })
    );

    const resultado = await new RecommendCajasExistentes().execute(suscriptor.id);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({ cajaMensualId: caja!.id, motivo: 'coincide con su perfil' });
  });

  it('responde 404 si no hay cajas mensuales disponibles', async () => {
    const { suscriptor } = await seedEscenarioVinos({ conCaja: false });
    const RecommendCajasExistentes = (await import('../src/modules/cajas-mensuales/domain/useCase/recommend-cajas-existentes')).default;

    await expect(new RecommendCajasExistentes().execute(suscriptor.id)).rejects.toMatchObject({ statusCode: 404 });
    expect(axiosPost).not.toHaveBeenCalled();
  });

  it('responde 404 si el suscriptor no existe', async () => {
    const RecommendCajasExistentes = (await import('../src/modules/cajas-mensuales/domain/useCase/recommend-cajas-existentes')).default;

    await expect(new RecommendCajasExistentes().execute('00000000-0000-0000-0000-000000000000')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
