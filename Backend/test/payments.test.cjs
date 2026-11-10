require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { DataSource } = require('typeorm');
const { entities } = require('../dist/common/patterns/factory/entities');
const { User } = require('../dist/modules/auth/infrastructure/user.entity');
const { Suscriptor } = require('../dist/modules/suscriptores/infrastructure/suscriptor.entity');
const { CajaMensual } = require('../dist/modules/cajas-mensuales/infrastructure/caja-mensual.entity');
const { Suscripcion } = require('../dist/modules/suscripciones/infrastructure/suscripcion.entity');
const { MensajeInbox } = require('../dist/modules/solicitudes-suscripcion/infrastructure/inbox.entity');
const { MensajeOutbox } = require('../dist/modules/solicitudes-suscripcion/infrastructure/outbox.entity');
const { SolicitudSuscripcion } = require('../dist/modules/solicitudes-suscripcion/infrastructure/solicitud.entity');
const { PlanPago } = require('../dist/modules/pagos/infrastructure/plan-pago.entity');
const { AceptarSolicitud } = require('../dist/modules/solicitudes-suscripcion/domain/aceptar-solicitud');
const { ProcesarSolicitud } = require('../dist/modules/solicitudes-suscripcion/domain/procesar-solicitud');
const { RetryReconciler } = require('../dist/modules/solicitudes-suscripcion/infrastructure/retry-reconciler');
const { ProcesarPago } = require('../dist/modules/pagos/domain/procesar-pago');
const { RegistrarEventoPago } = require('../dist/modules/pagos/domain/registrar-evento-pago');
const { createPaymentWebhookRouter } = require('../dist/modules/pagos/presentation/payment-webhook-router');
const { createMessageRouter } = require('../dist/common/messaging/message-router');
const { FakePaymentStrategy } = require('../dist/common/patterns/strategies/fake-payment.strategy');
const { StripePaymentStrategy } = require('../dist/common/patterns/strategies/stripe-payment.strategy');
const { createPaymentStrategy } = require('../dist/common/patterns/strategies/payment-strategy.registry');
const { convertAmount, assertFxConfigured } = require('../dist/modules/pagos/domain/currency-converter');

const config = { baseCurrency: 'ars', currency: 'ars', fxRate: null, successUrl: 'http://app/ok', cancelUrl: 'http://app/cancel' };

async function setup(t, { price = 100, flow = {} } = {}) {
  const db = new DataSource({ type: 'sqlite', database: ':memory:', entities, synchronize: true });
  await db.initialize();
  t.after(() => db.destroy());
  const subscriber = await db.getRepository(Suscriptor).save({ nombre: 'Test', email: 'person@example.test', activo: true });
  const user = await db.getRepository(User).save({ username: 'person', email: 'person@example.test', password: 'hash', role: 'subscriptor', suscriptorId: subscriber.id });
  const box = await db.getRepository(CajaMensual).save({ nombre: 'Caja', categoria: 'vinos', mes: 1, anio: 2026, precioBase: price, tenantId: 'tenant-a' });
  const solicitud = await new AceptarSolicitud(db).execute({ principalId: user.id, suscriptorId: subscriber.id, cajaMensualId: box.id, idempotencyKey: 'key', precioConfirmadoCentavos: price * 100 });
  const outbox = await db.getRepository(MensajeOutbox).findOneByOrFail({ solicitudId: solicitud.id });
  const strategy = new FakePaymentStrategy('secret');
  const processor = new ProcesarSolicitud(db, { maxAttempts: 3, retryDelayMs: 0, staleAfterMs: 1 }, { strategy, ...config, ...flow });
  const message = { messageId: outbox.id, requestId: solicitud.id, tenantId: 'tenant-a', type: outbox.tipo, version: 1, correlationId: solicitud.id, payload: {} };
  const state = async () => (await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: solicitud.id })).estado;
  return { db, solicitud, strategy, processor, message, state };
}

/** Registra un evento del proveedor y devuelve el sobre que el relay publicaría. */
async function deliver(db, solicitudId, event) {
  const result = await new RegistrarEventoPago(db).execute('fake', { solicitudId, ...event });
  const rows = await db.getRepository(MensajeOutbox).find({ where: { tipo: 'payment.event' } });
  const row = rows.find((r) => JSON.parse(r.contenido).event.providerEventId === event.providerEventId);
  const content = JSON.parse(row.contenido);
  return { result, envelope: { messageId: row.id, type: row.tipo, version: 1, requestId: solicitudId, tenantId: content.tenantId, correlationId: solicitudId, payload: content } };
}

test('con pagos habilitados la solicitud espera el pago y no crea la suscripción', async (t) => {
  const { db, strategy, processor, message, state } = await setup(t);
  assert.equal(await processor.execute(message), 'ack');
  assert.equal(await state(), 'esperando_pago');
  const stored = await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: message.requestId });
  assert.match(stored.checkoutUrl, /^http:\/\/localhost:3000\/fake-checkout\//);
  assert.equal(stored.paymentProvider, 'fake');
  assert.equal(await db.getRepository(Suscripcion).count(), 0);
  assert.equal(await db.getRepository(PlanPago).count(), 1);
  assert.equal(strategy.started[0].idempotencyKey, `subscription-request-${message.requestId}`);

  // Entrega duplicada: no se inicia otro checkout.
  assert.equal(await processor.execute(message), 'ack');
  assert.equal(strategy.started.length, 1);
  assert.equal(await db.getRepository(MensajeInbox).count(), 1);
});

test('pago exitoso activa la suscripción una sola vez aunque el evento llegue repetido', async (t) => {
  const { db, processor, message, state } = await setup(t);
  await processor.execute(message);
  const consumer = new ProcesarPago(db);
  const event = { providerEventId: 'evt_1', kind: 'payment.succeeded', providerSubscriptionId: 'sub_1', periodEnd: '2030-01-01T00:00:00.000Z' };

  const first = await deliver(db, message.requestId, event);
  const second = await deliver(db, message.requestId, event);
  assert.equal(first.result, 'registrado');
  assert.equal(second.result, 'duplicado');
  assert.equal(await consumer.execute(first.envelope), 'ack');
  assert.equal(await consumer.execute(first.envelope), 'ack');

  const subscriptions = await db.getRepository(Suscripcion).find();
  assert.equal(subscriptions.length, 1);
  assert.equal(subscriptions[0].estado, 'activa');
  assert.equal(subscriptions[0].providerSubscriptionId, 'sub_1');
  assert.equal(subscriptions[0].paymentProvider, 'fake');
  assert.equal(Number(subscriptions[0].montoMensual), 100);
  assert.equal(await state(), 'completado');
});

test('cobros posteriores renuevan, los rechazos pausan y la cancelación del proveedor cancela', async (t) => {
  const { db, processor, message } = await setup(t);
  await processor.execute(message);
  const consumer = new ProcesarPago(db);
  const send = async (event) => consumer.execute((await deliver(db, message.requestId, event)).envelope);
  await send({ providerEventId: 'e1', kind: 'payment.succeeded', providerSubscriptionId: 'sub_1' });
  const live = () => db.getRepository(Suscripcion).findOneByOrFail({});

  await send({ providerEventId: 'e2', kind: 'payment.succeeded', periodEnd: '2031-02-01T00:00:00.000Z' });
  assert.equal(new Date((await live()).proximoCobro).getUTCFullYear(), 2031);
  await send({ providerEventId: 'e3', kind: 'payment.failed' });
  assert.equal((await live()).estado, 'pausada');
  await send({ providerEventId: 'e4', kind: 'subscription.canceled' });
  assert.equal((await live()).estado, 'cancelada');
});

test('checkout abandonado expira la solicitud y libera al suscriptor para reintentar', async (t) => {
  const { db, solicitud, processor, message, state } = await setup(t);
  await processor.execute(message);
  const { envelope } = await deliver(db, message.requestId, { providerEventId: 'e1', kind: 'checkout.expired' });
  assert.equal(await new ProcesarPago(db).execute(envelope), 'ack');
  assert.equal(await state(), 'expirado');
  // 'esperando_pago' bloqueaba un nuevo pedido; 'expirado' ya no.
  const retry = await new AceptarSolicitud(db).execute({ principalId: solicitud.principalId, suscriptorId: solicitud.suscriptorId, cajaMensualId: solicitud.cajaMensualId, idempotencyKey: 'key-2', precioConfirmadoCentavos: 10000 });
  assert.equal(retry.estado, 'pendiente');
});

test('mientras espera el pago no se acepta otro pedido para la misma caja', async (t) => {
  const { db, solicitud, processor, message } = await setup(t);
  await processor.execute(message);
  await assert.rejects(
    new AceptarSolicitud(db).execute({ principalId: solicitud.principalId, suscriptorId: solicitud.suscriptorId, cajaMensualId: solicitud.cajaMensualId, idempotencyKey: 'key-3', precioConfirmadoCentavos: 10000 }),
    (error) => error.code === 'REQUEST_IN_PROGRESS');
});

test('si el proveedor falla se reintenta con el mismo pedido sin duplicar efectos', async (t) => {
  const { db, strategy, processor, message, state } = await setup(t);
  strategy.failNextStart = true;
  assert.equal(await processor.execute(message), 'ack'); // reintento durable programado
  assert.equal(await state(), 'pendiente');
  assert.equal(await db.getRepository(MensajeInbox).count(), 0);
  assert.equal(await db.getRepository(Suscripcion).count(), 0);

  const retried = { ...message, payload: { attempt: 1 } };
  assert.equal(await processor.execute(retried), 'ack');
  assert.equal(await state(), 'esperando_pago');
  assert.equal(strategy.started.length, 1);
});

test('un proceso caído tras reclamar la solicitud se recupera con el reconciliador', async (t) => {
  const { db, processor, message, state } = await setup(t);
  // Simula el crash: la solicitud quedó 'procesando' y el mensaje figura publicado hace rato.
  await db.getRepository(SolicitudSuscripcion).update(message.requestId, { estado: 'procesando' });
  await db.getRepository(MensajeOutbox).update(message.messageId, { estado: 'publicado', publishedAt: Date.now() - 60000 });
  const reconciler = new RetryReconciler(db, { maxAttempts: 3, retryDelayMs: 0, staleAfterMs: 1 });
  assert.equal(await reconciler.runOnce(), 'scheduled');
  assert.equal(await state(), 'pendiente');
  assert.equal(await processor.execute({ ...message, payload: { attempt: 1 } }), 'ack');
  assert.equal(await state(), 'esperando_pago');
});

test('el router de mensajes despacha por tipo y rechaza tipos desconocidos', async () => {
  const seen = [];
  const route = createMessageRouter({ a: async () => { seen.push('a'); return 'ack'; } });
  assert.equal(await route({ type: 'a' }), 'ack');
  assert.equal(await route({ type: 'toString' }), 'reject');
  assert.deepEqual(seen, ['a']);
});

test('webhook: firma inválida => 400, firma válida => 200 y evento en el outbox', async (t) => {
  const { db, processor, message } = await setup(t);
  await processor.execute(message);
  const app = express();
  app.use('/hook', express.raw({ type: '*/*' }), createPaymentWebhookRouter(db, new FakePaymentStrategy('secret')));
  const body = JSON.stringify({ providerEventId: 'evt_w', kind: 'payment.succeeded', solicitudId: message.requestId });

  await request(app).post('/hook').set('x-fake-signature', 'wrong').set('content-type', 'application/json').send(body).expect(400);
  assert.equal(await db.getRepository(MensajeOutbox).count({ where: { tipo: 'payment.event' } }), 0);
  await request(app).post('/hook').set('x-fake-signature', 'secret').set('content-type', 'application/json').send(body).expect(200);
  await request(app).post('/hook').set('x-fake-signature', 'secret').set('content-type', 'application/json').send(body).expect(200);
  assert.equal(await db.getRepository(MensajeOutbox).count({ where: { tipo: 'payment.event' } }), 1);
});

test('eventos de una solicitud desconocida o de otro proveedor se ignoran', async (t) => {
  const { db, processor, message } = await setup(t);
  await processor.execute(message);
  const producer = new RegistrarEventoPago(db);
  assert.equal(await producer.execute('fake', { providerEventId: 'x', kind: 'payment.succeeded', solicitudId: 'nope' }), 'ignorado');
  assert.equal(await producer.execute('stripe', { providerEventId: 'y', kind: 'payment.succeeded', solicitudId: message.requestId }), 'ignorado');
});

test('Stripe: normaliza eventos nativos y delega la idempotencia al SDK', async () => {
  const calls = [];
  let nextEvent;
  const client = {
    prices: { create: async (params, options) => { calls.push(['price', params, options]); return { id: 'price_1' }; } },
    checkout: { sessions: { create: async (params, options) => { calls.push(['session', params, options]); return { id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' }; } } },
    subscriptions: { cancel: async () => ({ status: 'canceled' }), update: async (id, params) => { calls.push(['update', id, params]); return { pause_collection: params.pause_collection === '' ? null : params.pause_collection }; } },
    webhooks: { constructEvent: (_body, signature) => { if (signature !== 'good') throw new Error('bad'); return nextEvent; } },
  };
  const stripe = new StripePaymentStrategy('', 'whsec_test', client);

  assert.equal(await stripe.createSubscriptionPlan({ planKey: 'k', name: 'Caja', amountCents: 10000, currency: 'ars', intervalMonths: 1 }), 'price_1');
  assert.deepEqual(calls[0][1].recurring, { interval: 'month', interval_count: 1 });
  const started = await stripe.startSubscription({ providerPlanId: 'price_1', idempotencyKey: 'idem', solicitudId: 's1', tenantId: 't1', successUrl: 'u', cancelUrl: 'c' });
  assert.equal(started.checkoutUrl, 'https://checkout.stripe.test/cs_1');
  assert.equal(calls[1][2].idempotencyKey, 'idem');
  assert.deepEqual(calls[1][1].subscription_data.metadata, { solicitudId: 's1', tenantId: 't1' });
  assert.equal(await stripe.cancelSubscription('sub_1'), true);
  assert.equal(await stripe.pauseSubscription('sub_1'), true);
  assert.equal(await stripe.resumeSubscription('sub_1'), true);
  assert.deepEqual(calls.filter((c) => c[0] === 'update').map((c) => c[2]), [{ pause_collection: { behavior: 'void' } }, { pause_collection: '' }]);

  nextEvent = { id: 'evt_1', type: 'invoice.paid', data: { object: { amount_paid: 10000, parent: { subscription_details: { subscription: 'sub_9', metadata: { solicitudId: 's1' } } }, lines: { data: [{ period: { end: 1893456000 } }] } } } };
  assert.deepEqual(stripe.parseWebhook(Buffer.from('{}'), { 'stripe-signature': 'good' }), [{
    providerEventId: 'evt_1', kind: 'payment.succeeded', solicitudId: 's1', providerSubscriptionId: 'sub_9', amountCents: 10000, periodEnd: '2030-01-01T00:00:00.000Z',
  }]);
  nextEvent = { id: 'evt_2', type: 'customer.created', data: { object: {} } };
  assert.deepEqual(stripe.parseWebhook(Buffer.from('{}'), { 'stripe-signature': 'good' }), []);
  assert.throws(() => stripe.parseWebhook(Buffer.from('{}'), { 'stripe-signature': 'bad' }), /Firma de webhook inválida/);
});

test('el registro elige la estrategia por configuración', () => {
  assert.equal(createPaymentStrategy({ provider: 'none' }), null);
  assert.equal(createPaymentStrategy({ provider: 'fake', fakeWebhookSecret: 's' }).providerName, 'fake');
  assert.throws(() => createPaymentStrategy({ provider: 'stripe', stripe: { secretKey: '', webhookSecret: '' } }), /STRIPE_SECRET_KEY/);
  assert.throws(() => createPaymentStrategy({ provider: 'otro' }), /inválido/);
});

test('cancelar una suscripción pagada cancela primero en el proveedor', async (t) => {
  const { db, strategy, processor, message } = await setup(t);
  await processor.execute(message);
  const { envelope } = await deliver(db, message.requestId, { providerEventId: 'e1', kind: 'payment.succeeded', providerSubscriptionId: 'sub_1' });
  await new ProcesarPago(db).execute(envelope);
  const { setActiveDataSource } = require('../dist/config/database.config');
  setActiveDataSource(db);
  t.after(() => setActiveDataSource(null));
  const { default: CancelSuscripcion } = require('../dist/modules/suscripciones/domain/useCase/cancel-suscripcion');
  const live = await db.getRepository(Suscripcion).findOneByOrFail({});

  const canceled = [];
  strategy.cancelSubscription = async (id) => { canceled.push(id); return true; };
  assert.equal((await new CancelSuscripcion(strategy).execute(live.id)).estado, 'cancelada');
  assert.deepEqual(canceled, ['sub_1']);

  await db.getRepository(Suscripcion).update(live.id, { estado: 'activa' });
  strategy.cancelSubscription = async () => { throw new Error('down'); };
  await assert.rejects(new CancelSuscripcion(strategy).execute(live.id), (error) => error.statusCode === 502);
  assert.equal((await db.getRepository(Suscripcion).findOneByOrFail({ id: live.id })).estado, 'activa');
  await assert.rejects(new CancelSuscripcion(null).execute(live.id), (error) => error.statusCode === 503);
});

test('pausar y reanudar una suscripción pagada actúan primero en el proveedor', async (t) => {
  const { db, strategy, processor, message } = await setup(t);
  await processor.execute(message);
  const { envelope } = await deliver(db, message.requestId, { providerEventId: 'e1', kind: 'payment.succeeded', providerSubscriptionId: 'sub_1' });
  await new ProcesarPago(db).execute(envelope);
  const { setActiveDataSource } = require('../dist/config/database.config');
  setActiveDataSource(db);
  t.after(() => setActiveDataSource(null));
  const { default: PauseSuscripcion } = require('../dist/modules/suscripciones/domain/useCase/pause-suscripcion');
  const { default: ResumeSuscripcion } = require('../dist/modules/suscripciones/domain/useCase/resume-suscripcion');
  const live = await db.getRepository(Suscripcion).findOneByOrFail({});
  const estado = async () => (await db.getRepository(Suscripcion).findOneByOrFail({ id: live.id })).estado;

  const calls = [];
  strategy.pauseSubscription = async (id) => { calls.push(['pause', id]); return true; };
  strategy.resumeSubscription = async (id) => { calls.push(['resume', id]); return true; };

  // Reanudar una suscripción activa no tiene sentido.
  await assert.rejects(new ResumeSuscripcion(strategy).execute(live.id), (error) => error.statusCode === 400);
  assert.equal((await new PauseSuscripcion(strategy).execute(live.id)).estado, 'pausada');
  assert.equal((await new ResumeSuscripcion(strategy).execute(live.id)).estado, 'activa');
  assert.deepEqual(calls, [['pause', 'sub_1'], ['resume', 'sub_1']]);

  // Si el proveedor falla, el estado local no cambia (no queda "pausada" pero cobrándose).
  strategy.pauseSubscription = async () => { throw new Error('down'); };
  await assert.rejects(new PauseSuscripcion(strategy).execute(live.id), (error) => error.statusCode === 502);
  assert.equal(await estado(), 'activa');
  await db.getRepository(Suscripcion).update(live.id, { estado: 'pausada' });
  strategy.resumeSubscription = async () => { throw new Error('down'); };
  await assert.rejects(new ResumeSuscripcion(strategy).execute(live.id), (error) => error.statusCode === 502);
  assert.equal(await estado(), 'pausada');
  await assert.rejects(new ResumeSuscripcion(null).execute(live.id), (error) => error.statusCode === 503);
});

test('las suscripciones sin proveedor (alta administrativa) se pausan y reanudan sin llamar a ninguno', async (t) => {
  const { db, strategy, solicitud } = await setup(t);
  const { setActiveDataSource } = require('../dist/config/database.config');
  setActiveDataSource(db);
  t.after(() => setActiveDataSource(null));
  const { default: PauseSuscripcion } = require('../dist/modules/suscripciones/domain/useCase/pause-suscripcion');
  const { default: ResumeSuscripcion } = require('../dist/modules/suscripciones/domain/useCase/resume-suscripcion');
  const sub = await db.getRepository(Suscripcion).save({ suscriptorId: solicitud.suscriptorId, cajaMensualId: solicitud.cajaMensualId, categoria: 'vinos', estado: 'activa', montoMensual: 100, tenantId: 'tenant-a' });
  strategy.pauseSubscription = strategy.resumeSubscription = async () => { throw new Error('no debería llamarse'); };
  assert.equal((await new PauseSuscripcion(strategy).execute(sub.id)).estado, 'pausada');
  assert.equal((await new ResumeSuscripcion(strategy).execute(sub.id)).estado, 'activa');
});

test('convertAmount convierte pesos a la moneda de cobro con redondeo al centavo', () => {
  assert.deepEqual(convertAmount(1450000, 'ARS', 'USD', 1200), { amountCents: 1208, from: 'ars', to: 'usd', rate: 1200 });
  assert.equal(convertAmount(480000, 'ars', 'usd', 1200).amountCents, 400);
  assert.deepEqual(convertAmount(12345, 'ARS', 'ars', null), { amountCents: 12345, from: 'ars', to: 'ars', rate: 1 });
  assert.throws(() => convertAmount(1000, 'ars', 'usd', null), /PAYMENT_FX_RATE/);
  assert.throws(() => convertAmount(1000, 'ars', 'usd', 0), /PAYMENT_FX_RATE/);
  assert.throws(() => convertAmount(100, 'ars', 'usd', 1e9), /menor a un centavo/);
  assert.throws(() => convertAmount(0, 'ars', 'usd', 1200), /inválido/);
});

test('el cobro se hace en la moneda del proveedor al tipo de cambio configurado y queda registrado', async (t) => {
  const { db, strategy, processor, message, solicitud } = await setup(t, { price: 14500, flow: { currency: 'usd', fxRate: 1200 } });
  const plans = [];
  const original = strategy.createSubscriptionPlan.bind(strategy);
  strategy.createSubscriptionPlan = (plan) => { plans.push(plan); return original(plan); };

  assert.equal(await processor.execute(message), 'ack');
  assert.equal(plans.length, 1);
  assert.equal(plans[0].amountCents, 1208); // 14500 ARS / 1200 = 12.08 USD
  assert.equal(plans[0].currency, 'usd');
  const stored = await db.getRepository(SolicitudSuscripcion).findOneByOrFail({ id: solicitud.id });
  assert.equal(stored.chargeAmountCents, 1208);
  assert.equal(stored.chargeCurrency, 'usd');
  assert.equal(Number(stored.fxRate), 1200);
  assert.equal(Number(stored.precioConfirmado), 14500, 'el precio confirmado sigue en pesos');
  const suscripcion = await (async () => {
    const { envelope } = await deliver(db, solicitud.id, { providerEventId: 'e1', kind: 'payment.succeeded', providerSubscriptionId: 'sub_1' });
    await new ProcesarPago(db).execute(envelope);
    return db.getRepository(Suscripcion).findOneByOrFail({});
  })();
  assert.equal(Number(suscripcion.montoMensual), 14500, 'la membresía se registra en pesos');
});

test('el plan se vuelve a crear si cambia el tipo de cambio', async (t) => {
  const { db, strategy, processor, message } = await setup(t, { price: 14500, flow: { currency: 'usd', fxRate: 1200 } });
  await processor.execute(message);
  assert.equal(await db.getRepository(PlanPago).count(), 1);
  const richer = new ProcesarSolicitud(db, { maxAttempts: 3, retryDelayMs: 0, staleAfterMs: 1 }, { strategy, ...config, currency: 'usd', fxRate: 1000 });
  await db.getRepository(SolicitudSuscripcion).update(message.requestId, { estado: 'pendiente' });
  await db.getRepository(MensajeInbox).clear();
  await richer.execute(message);
  const amounts = (await db.getRepository(PlanPago).find()).map((p) => p.amountCents).sort();
  assert.deepEqual(amounts, [1208, 1450]);
});

test('un evento de pago publicado y nunca consumido se republica; uno ya consumido no; el imposible termina en fallido', async (t) => {
  const { PaymentEventReconciler } = require('../dist/modules/pagos/infrastructure/payment-event-reconciler');
  const { db, processor, message } = await setup(t);
  await processor.execute(message);
  const lost = await deliver(db, message.requestId, { providerEventId: 'lost', kind: 'payment.succeeded', providerSubscriptionId: 'sub_1' });
  const outbox = db.getRepository(MensajeOutbox);
  let clock = 1_000_000;
  const reconciler = new PaymentEventReconciler(db, { staleAfterMs: 1000, maxAttempts: 2, now: () => clock });
  const publish = (id) => outbox.update(id, { estado: 'publicado', publishedAt: clock - 5000, nextAttemptAt: null });

  // Todavía reciente: no se toca.
  await outbox.update(lost.envelope.messageId, { estado: 'publicado', publishedAt: clock - 10 });
  assert.equal(await reconciler.runOnce(), 'idle');

  // Publicado hace rato y sin consumir (se fue a la cola de mensajes muertos): se republica.
  await publish(lost.envelope.messageId);
  assert.equal(await reconciler.runOnce(), 'republished');
  const requeued = await outbox.findOneByOrFail({ id: lost.envelope.messageId });
  assert.equal(requeued.estado, 'pendiente');
  assert.equal(requeued.intentos, 1);

  // Al reprocesarse el evento se aplica una sola vez, aunque el inbox ya lo vea después.
  assert.equal(await new ProcesarPago(db).execute(lost.envelope), 'ack');
  assert.equal(await db.getRepository(Suscripcion).count(), 1);
  await publish(lost.envelope.messageId);
  assert.equal(await reconciler.runOnce(), 'idle', 'ya consumido: tiene inbox');

  // Un evento que nunca se puede procesar deja de republicarse.
  const poison = await deliver(db, message.requestId, { providerEventId: 'poison', kind: 'payment.succeeded' });
  await outbox.update(poison.envelope.messageId, { estado: 'publicado', publishedAt: clock - 5000, intentos: 2 });
  assert.equal(await reconciler.runOnce(), 'failed');
  assert.equal((await outbox.findOneByOrFail({ id: poison.envelope.messageId })).estado, 'fallido');
  assert.equal(await reconciler.runOnce(), 'idle');
});

test('un cobro rechazado pausa por pago y el siguiente cobro exitoso reactiva; la pausa manual no se reactiva sola', async (t) => {
  const { db, processor, message } = await setup(t);
  await processor.execute(message);
  const consumer = new ProcesarPago(db);
  const send = async (event) => consumer.execute((await deliver(db, message.requestId, event)).envelope);
  const subs = db.getRepository(Suscripcion);
  await send({ providerEventId: 'e1', kind: 'payment.succeeded', providerSubscriptionId: 'sub_1' });
  const live = () => subs.findOneByOrFail({});

  await send({ providerEventId: 'e2', kind: 'payment.failed' });
  assert.deepEqual([(await live()).estado, (await live()).pausadaPorPago], ['pausada', true]);
  await send({ providerEventId: 'e3', kind: 'payment.succeeded', periodEnd: '2032-01-01T00:00:00.000Z' });
  assert.deepEqual([(await live()).estado, (await live()).pausadaPorPago], ['activa', false]);

  // Pausa pedida por el suscriptor: un cobro posterior NO la reactiva.
  await subs.update((await live()).id, { estado: 'pausada', pausadaPorPago: false });
  await send({ providerEventId: 'e4', kind: 'payment.succeeded', periodEnd: '2032-02-01T00:00:00.000Z' });
  assert.equal((await live()).estado, 'pausada');
});

test('no se puede reanudar a mano una suscripción pausada por un pago rechazado', async (t) => {
  const { db, strategy, processor, message } = await setup(t);
  await processor.execute(message);
  const { envelope } = await deliver(db, message.requestId, { providerEventId: 'e1', kind: 'payment.succeeded', providerSubscriptionId: 'sub_1' });
  await new ProcesarPago(db).execute(envelope);
  const { setActiveDataSource } = require('../dist/config/database.config');
  setActiveDataSource(db);
  t.after(() => setActiveDataSource(null));
  const { default: ResumeSuscripcion } = require('../dist/modules/suscripciones/domain/useCase/resume-suscripcion');
  const live = await db.getRepository(Suscripcion).findOneByOrFail({});
  await db.getRepository(Suscripcion).update(live.id, { estado: 'pausada', pausadaPorPago: true });
  await assert.rejects(new ResumeSuscripcion(strategy).execute(live.id), (error) => error.statusCode === 409);
});

test('descartar un pedido que espera el pago invalida el checkout y libera la caja', async (t) => {
  const { DescartarSolicitud } = require('../dist/modules/solicitudes-suscripcion/domain/descartar-solicitud');
  const { db, strategy, solicitud, processor, message, state } = await setup(t);
  const who = { requestId: solicitud.id, principalId: solicitud.principalId, suscriptorId: solicitud.suscriptorId };

  // Todavía no espera pago (pendiente): no se descarta.
  await assert.rejects(new DescartarSolicitud(db, strategy).execute(who), (e) => e.statusCode === 409);

  await processor.execute(message);
  const expired = [];
  strategy.expireCheckout = async (id) => { expired.push(id); };
  const result = await new DescartarSolicitud(db, strategy).execute(who);
  assert.equal(result.estado, 'expirado');
  assert.equal(expired.length, 1);
  assert.match(expired[0], /^fake_sess_/);
  // Idempotente y sin volver a llamar al proveedor.
  assert.equal((await new DescartarSolicitud(db, strategy).execute(who)).estado, 'expirado');
  assert.equal(expired.length, 1);
  // La caja queda libre.
  const again = await new AceptarSolicitud(db).execute({ principalId: solicitud.principalId, suscriptorId: solicitud.suscriptorId, cajaMensualId: solicitud.cajaMensualId, idempotencyKey: 'otra', precioConfirmadoCentavos: 10000 });
  assert.equal(again.estado, 'pendiente');
  // Otro usuario no puede descartar el pedido ajeno.
  await assert.rejects(new DescartarSolicitud(db, strategy).execute({ ...who, principalId: 'otro' }), (e) => e.statusCode === 404);
});

test('si el proveedor no puede expirar el checkout (ya pagado) el pedido NO se descarta', async (t) => {
  const { DescartarSolicitud } = require('../dist/modules/solicitudes-suscripcion/domain/descartar-solicitud');
  const { db, strategy, solicitud, processor, message, state } = await setup(t);
  await processor.execute(message);
  const who = { requestId: solicitud.id, principalId: solicitud.principalId, suscriptorId: solicitud.suscriptorId };
  strategy.expireCheckout = async () => { throw new Error('session complete'); };
  await assert.rejects(new DescartarSolicitud(db, strategy).execute(who), (e) => e.statusCode === 409);
  assert.equal(await state(), 'esperando_pago');
  await assert.rejects(new DescartarSolicitud(db, null).execute(who), (e) => e.statusCode === 503);
});

test('Stripe: el checkout vence a los N minutos y se puede expirar a mano', async () => {
  const calls = [];
  const client = {
    checkout: { sessions: {
      create: async (params) => { calls.push(['create', params]); return { id: 'cs_1', url: 'https://x.test' }; },
      expire: async (id) => { calls.push(['expire', id]); return {}; },
    } },
  };
  const stripe = new StripePaymentStrategy('', 'whsec', client);
  const before = Math.floor(Date.now() / 1000);
  await stripe.startSubscription({ providerPlanId: 'p', idempotencyKey: 'k', solicitudId: 's', tenantId: 't', successUrl: 'u', cancelUrl: 'c', expiresInMinutes: 30 });
  assert.ok(calls[0][1].expires_at >= before + 30 * 60 && calls[0][1].expires_at <= before + 30 * 60 + 5);
  await stripe.expireCheckout('cs_1');
  assert.deepEqual(calls[1], ['expire', 'cs_1']);
});

test('el cliente del proveedor se reutiliza en la segunda compra del mismo suscriptor', async (t) => {
  const { db, strategy, solicitud, processor, message } = await setup(t);
  await processor.execute(message);
  assert.equal(strategy.started[0].providerCustomerId, undefined, 'primera compra: aún no hay cliente');
  const { envelope } = await deliver(db, solicitud.id, { providerEventId: 'e1', kind: 'payment.succeeded', providerSubscriptionId: 'sub_1', providerCustomerId: 'cus_1' });
  await new ProcesarPago(db).execute(envelope);

  const box2 = await db.getRepository(CajaMensual).save({ nombre: 'Caja 2', categoria: 'cafes', mes: 1, anio: 2026, precioBase: 50, tenantId: 'tenant-a' });
  const second = await new AceptarSolicitud(db).execute({ principalId: solicitud.principalId, suscriptorId: solicitud.suscriptorId, cajaMensualId: box2.id, idempotencyKey: 'k2', precioConfirmadoCentavos: 5000 });
  const outbox = await db.getRepository(MensajeOutbox).findOneByOrFail({ solicitudId: second.id, tipo: 'subscription.requested' });
  await processor.execute({ messageId: outbox.id, requestId: second.id, tenantId: 'tenant-a', type: outbox.tipo, version: 1, correlationId: second.id, payload: {} });
  assert.equal(strategy.started[1].providerCustomerId, 'cus_1');
});

test('Stripe: con cliente conocido el checkout lo reutiliza y los eventos informan el cliente', async () => {
  const calls = [];
  let nextEvent;
  const client = {
    checkout: { sessions: { create: async (params) => { calls.push(params); return { id: 'cs', url: 'https://x.test' }; } } },
    subscriptions: { retrieve: async () => ({ customer: 'cus_9' }) },
    billingPortal: { sessions: { create: async (params) => { calls.push(['portal', params]); return { url: 'https://portal.test/s' }; } } },
    webhooks: { constructEvent: () => nextEvent },
  };
  const stripe = new StripePaymentStrategy('', 'whsec', client);
  const base = { providerPlanId: 'p', idempotencyKey: 'k', solicitudId: 's', tenantId: 't', successUrl: 'u', cancelUrl: 'c' };
  await stripe.startSubscription({ ...base, customerEmail: 'a@b.test' });
  await stripe.startSubscription({ ...base, customerEmail: 'a@b.test', providerCustomerId: 'cus_9' });
  assert.equal(calls[0].customer_email, 'a@b.test');
  assert.equal(calls[0].customer, undefined);
  assert.equal(calls[1].customer, 'cus_9');
  assert.equal(calls[1].customer_email, undefined, 'customer y customer_email son excluyentes en Stripe');

  assert.equal(await stripe.createBillingPortalSession('sub_1', 'http://app/catalogo'), 'https://portal.test/s');
  assert.deepEqual(calls[2], ['portal', { customer: 'cus_9', return_url: 'http://app/catalogo' }]);

  nextEvent = { id: 'evt', type: 'invoice.paid', data: { object: { customer: 'cus_9', amount_paid: 1, parent: { subscription_details: { subscription: 'sub_1', metadata: { solicitudId: 's1' } } } } } };
  assert.equal(stripe.parseWebhook(Buffer.from('{}'), { 'stripe-signature': 'x' })[0].providerCustomerId, 'cus_9');
});

test('portal de facturación: sólo para suscripciones con medio de pago y proveedor disponible', async (t) => {
  const { db, strategy, solicitud, processor, message } = await setup(t);
  await processor.execute(message);
  const { envelope } = await deliver(db, solicitud.id, { providerEventId: 'e1', kind: 'payment.succeeded', providerSubscriptionId: 'sub_1' });
  await new ProcesarPago(db).execute(envelope);
  const { setActiveDataSource } = require('../dist/config/database.config');
  setActiveDataSource(db);
  t.after(() => setActiveDataSource(null));
  const { default: BillingPortal } = require('../dist/modules/suscripciones/domain/useCase/billing-portal');
  const live = await db.getRepository(Suscripcion).findOneByOrFail({});

  const { url } = await new BillingPortal(strategy).execute(live.id);
  assert.match(url, /portal\/sub_1/);
  await assert.rejects(new BillingPortal(null).execute(live.id), (e) => e.statusCode === 503);
  strategy.createBillingPortalSession = async () => { throw new Error('down'); };
  await assert.rejects(new BillingPortal(strategy).execute(live.id), (e) => e.statusCode === 502);
  await db.getRepository(Suscripcion).update(live.id, { providerSubscriptionId: null });
  await assert.rejects(new BillingPortal(strategy).execute(live.id), (e) => e.statusCode === 400);
});

test('la validación de arranque exige tipo de cambio sólo si hay que convertir, con cualquier tipo de cambio válido', () => {
  assert.doesNotThrow(() => assertFxConfigured('ars', 'ARS', null));
  assert.doesNotThrow(() => assertFxConfigured('ARS', 'USD', 1200));
  assert.doesNotThrow(() => assertFxConfigured('ARS', 'USD', 1_000_000));
  assert.throws(() => assertFxConfigured('ARS', 'USD', null), /PAYMENT_FX_RATE/);
  assert.throws(() => assertFxConfigured('ARS', 'USD', -5), /PAYMENT_FX_RATE/);
});
