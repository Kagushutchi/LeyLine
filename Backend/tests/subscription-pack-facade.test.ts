import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataSource } from 'typeorm';

// El Facade reserva stock por SOAP directamente desde el listener de Observer (no pasa por
// `SOAP_INVENTARIO_ENABLED`), así que mockeamos el cliente SOAP una sola vez para todo el
// archivo y nunca salimos a la red real.
const reservarStockMock = vi.fn();
vi.mock('../src/modules/inventario/client/inventario-soap-client', () => ({
  InventarioSoapClient: class {
    reservarStock(...args: unknown[]) {
      return reservarStockMock(...args);
    }
  },
}));

let dataSource: DataSource;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_SQLITE_PATH = ':memory:';
  process.env.DB_SYNCHRONIZE = 'true';
  process.env.DB_LOGGING = 'false';
  // La creación de la suscripción (CreateSuscripcion.verifyStock) no es lo que este archivo
  // ejercita: se desactiva para no depender del SOAP real, igual que en tests/api.test.ts.
  process.env.SOAP_INVENTARIO_ENABLED = 'false';
  process.env.PAYMENT_PROVIDER = 'none';

  const dbModule = await import('../src/config/database.config');
  dataSource = dbModule.AppDataSource;
  await dataSource.initialize();
  await dataSource.synchronize();
});

afterAll(async () => {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
});

afterEach(async () => {
  reservarStockMock.mockReset();
  reservarStockMock.mockResolvedValue({
    exito: true,
    productoId: 'cualquiera',
    cantidadSolicitada: 1,
    cantidadDisponible: 10,
    cantidadReservada: 1,
    mensaje: 'ok',
  });

  // envConfig.payments es un objeto mutable creado una sola vez al importar el módulo (igual
  // que envConfig.deepseek en ai-recommendations.test.ts): se restaura directamente en vez de
  // usar vi.resetModules(), que invalidaría las clases de entidades ya usadas por el DataSource.
  const { envConfig } = await import('../src/config/env.config');
  envConfig.payments.provider = 'none';
});

// El DataSource es compartido por todo el archivo: sin esto, filas de un test (p. ej. una
// Suscripcion ya "activa" para el mismo suscriptor y caja) harían fallar la regla de
// "una suscripción viva por suscriptor y caja" en el test siguiente.
beforeEach(async () => {
  const { PlanPago } = await import('../src/modules/pagos/infrastructure/plan-pago.entity');
  const { ClientePago } = await import('../src/modules/pagos/infrastructure/cliente-pago.entity');
  const { Suscripcion } = await import('../src/modules/suscripciones/infrastructure/suscripcion.entity');
  const { CajaMensualProducto } = await import('../src/modules/cajas-mensuales/infrastructure/caja-mensual-producto.entity');
  const { CajaMensual } = await import('../src/modules/cajas-mensuales/infrastructure/caja-mensual.entity');
  const { Producto } = await import('../src/modules/productos/infrastructure/producto.entity');
  const { Suscriptor } = await import('../src/modules/suscriptores/infrastructure/suscriptor.entity');

  await dataSource.getRepository(PlanPago).clear();
  await dataSource.getRepository(ClientePago).clear();
  await dataSource.getRepository(Suscripcion).clear();
  await dataSource.getRepository(CajaMensualProducto).clear();
  await dataSource.getRepository(CajaMensual).clear();
  await dataSource.getRepository(Producto).clear();
  await dataSource.getRepository(Suscriptor).clear();
});

/** Siembra un suscriptor y una caja mensual disponible con un producto en su composición. */
async function seedSuscriptorYCaja(opts: { cantidad?: number } = {}) {
  const { Suscriptor } = await import('../src/modules/suscriptores/infrastructure/suscriptor.entity');
  const { Producto } = await import('../src/modules/productos/infrastructure/producto.entity');
  const { CajaMensual } = await import('../src/modules/cajas-mensuales/infrastructure/caja-mensual.entity');
  const { CajaMensualProducto } = await import('../src/modules/cajas-mensuales/infrastructure/caja-mensual-producto.entity');

  const suscriptor = await dataSource.getRepository(Suscriptor).save(
    dataSource.getRepository(Suscriptor).create({
      nombre: 'Lucía',
      apellido: 'Test',
      email: `lucia-${Date.now()}-${Math.random()}@leyline.test`,
    })
  );

  const producto = await dataSource.getRepository(Producto).save(
    dataSource.getRepository(Producto).create({
      nombre: 'Café de Prueba',
      categoria: 'cafes',
      tipo: 'Tueste medio',
      productor: 'Tostadero Test',
      precioReferencia: 500,
      activo: true,
    })
  );

  const caja = await dataSource.getRepository(CajaMensual).save(
    dataSource.getRepository(CajaMensual).create({
      nombre: 'Caja Café Mensual',
      categoria: 'cafes',
      mes: 1,
      anio: 2026,
      precioBase: 1500,
      disponible: true,
    })
  );

  await dataSource.getRepository(CajaMensualProducto).save(
    dataSource.getRepository(CajaMensualProducto).create({
      cajaMensualId: caja.id,
      productoId: producto.id,
      cantidad: opts.cantidad ?? 2,
    })
  );

  return { suscriptor, producto, caja };
}

describe('SubscriptionPackFacade', () => {
  it('activa la suscripción y despacha la orden de empaque sin cobro cuando PAYMENT_PROVIDER=none', async () => {
    const { SubscriptionPackFacade } = await import('../src/common/patterns/facades/subscription-pack.facade');
    const { suscriptor, producto, caja } = await seedSuscriptorYCaja({ cantidad: 3 });

    // Instanciar el Facade más de una vez no debe duplicar la suscripción al EventDispatcher
    // (es un singleton): el guard por módulo debe evitarlo.
    new SubscriptionPackFacade();
    const facade = new SubscriptionPackFacade();

    const resultado = await facade.activateSubscriptionAndPrepareFirstBox(suscriptor.id, caja.id);

    expect(resultado.status).toBe('ACTIVATED');
    expect(resultado.checkoutUrl).toBeUndefined();
    expect(resultado.suscripcionId).toBeTruthy();

    const { Suscripcion } = await import('../src/modules/suscripciones/infrastructure/suscripcion.entity');
    const suscripcion = await dataSource.getRepository(Suscripcion).findOneBy({ id: resultado.suscripcionId });
    expect(suscripcion?.estado).toBe('activa');
    expect(suscripcion?.suscriptorId).toBe(suscriptor.id);

    // El dispatch del evento SuscripcionActivada es `await`eado dentro del propio método, así
    // que para cuando activateSubscriptionAndPrepareFirstBox resuelve, el listener ya corrió.
    expect(reservarStockMock).toHaveBeenCalledTimes(1);
    expect(reservarStockMock).toHaveBeenCalledWith(producto.id, 3);
  });

  it('inicia el checkout con la estrategia configurada (fake) y lo deja con pago pendiente', async () => {
    const { envConfig } = await import('../src/config/env.config');
    envConfig.payments.provider = 'fake';

    const { SubscriptionPackFacade } = await import('../src/common/patterns/facades/subscription-pack.facade');
    const { suscriptor, caja } = await seedSuscriptorYCaja();
    const facade = new SubscriptionPackFacade();

    const resultado = await facade.activateSubscriptionAndPrepareFirstBox(suscriptor.id, caja.id);

    expect(resultado.status).toBe('ACTIVATED_AWAITING_PAYMENT');
    expect(resultado.checkoutUrl).toMatch(/^http:\/\/localhost:3000\/fake-checkout\//);

    const { PlanPago } = await import('../src/modules/pagos/infrastructure/plan-pago.entity');
    const planes = await dataSource.getRepository(PlanPago).find({ where: { cajaMensualId: caja.id } });
    expect(planes).toHaveLength(1);
    expect(planes[0].provider).toBe('fake');

    // La orden de empaque (Observer) se dispara igual, haya o no cobro de por medio.
    expect(reservarStockMock).toHaveBeenCalledTimes(1);
  });

  it('responde 404 si la caja mensual (plan) no existe', async () => {
    const { SubscriptionPackFacade } = await import('../src/common/patterns/facades/subscription-pack.facade');
    const { suscriptor } = await seedSuscriptorYCaja();
    const facade = new SubscriptionPackFacade();

    await expect(
      facade.activateSubscriptionAndPrepareFirstBox(suscriptor.id, 'caja-inexistente')
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(reservarStockMock).not.toHaveBeenCalled();
  });

  it('no interrumpe la activación si la reserva de stock SOAP falla para un producto', async () => {
    reservarStockMock.mockRejectedValueOnce(new Error('servicio SOAP caído'));

    const { SubscriptionPackFacade } = await import('../src/common/patterns/facades/subscription-pack.facade');
    const { suscriptor, caja } = await seedSuscriptorYCaja();
    const facade = new SubscriptionPackFacade();

    const resultado = await facade.activateSubscriptionAndPrepareFirstBox(suscriptor.id, caja.id);

    // La suscripción queda activada igual: una reserva de empaque fallida se loguea, no tira
    // abajo la alta de la suscripción (ver registerPackagingListener).
    expect(resultado.status).toBe('ACTIVATED');
    expect(reservarStockMock).toHaveBeenCalledTimes(1);
  });
});
