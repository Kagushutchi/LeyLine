import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockForFailure, classifySubmissionFailure, safeCheckoutUrl, hasInFlightRequest, pollDelayForAge, formatDay, formatCharge } from '../src/modules/suscripciones/store/solicitudes.logic.ts';
const http = (status, code) => ({ response: { status, data: { code } } });
test('timeouts and server failures preserve an uncertain attempt', () => {
  assert.equal(classifySubmissionFailure(new Error('timeout')), 'uncertain');
  assert.equal(classifySubmissionFailure(http(500)), 'uncertain');
  assert.equal(classifySubmissionFailure(http(429)), 'uncertain');
  assert.equal(classifySubmissionFailure(http(408)), 'uncertain');
});
test('only explicit price code releases an intent, key conflicts do not', () => {
  assert.equal(classifySubmissionFailure(http(409, 'PRICE_CHANGED')), 'price-changed');
  assert.equal(classifySubmissionFailure(http(409, 'IDEMPOTENCY_KEY_CONFLICT')), 'conflict');
  assert.equal(classifySubmissionFailure(http(409)), 'conflict');
  assert.equal(classifySubmissionFailure(http(403)), 'rejected');
});
test('key conflict remains blocked after saving and recovering a draft', () => {
  const draft = { key: 'stable', payload: { cajaMensualId: 'c', precioConfirmadoCentavos: 100 }, blocked: blockForFailure(classifySubmissionFailure(http(409, 'IDEMPOTENCY_KEY_CONFLICT'))) };
  const restored = JSON.parse(JSON.stringify(draft));
  assert.equal(restored.blocked, 'conflict');
  assert.equal(restored.key, 'stable');
  assert.deepEqual(restored.payload, draft.payload);
  assert.equal(blockForFailure('uncertain'), undefined);
});

test('duplicate-subscription conflicts are definitive and do not block the draft', () => {
  assert.equal(classifySubmissionFailure(http(409, 'ALREADY_SUBSCRIBED')), 'already-subscribed');
  assert.equal(classifySubmissionFailure(http(409, 'REQUEST_IN_PROGRESS')), 'in-progress');
  assert.equal(blockForFailure('already-subscribed'), undefined);
  assert.equal(blockForFailure(classifySubmissionFailure(http(409, 'IDEMPOTENCY_KEY_CONFLICT'))), 'conflict');
});

test('solo se redirige a URLs de checkout http(s) válidas', () => {
  assert.equal(safeCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_1#frag'), 'https://checkout.stripe.com/c/pay/cs_test_1#frag');
  assert.equal(safeCheckoutUrl('http://localhost:3000/fake-checkout/abc'), 'http://localhost:3000/fake-checkout/abc');
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'not a url', '', null, undefined, 42]) assert.equal(safeCheckoutUrl(bad), null);
});

test('esperando_pago no dispara polling; sí lo hace mientras el servidor resuelve el pedido', () => {
  const now = 1_000_000;
  assert.equal(hasInFlightRequest([], now, 0), false);
  assert.equal(hasInFlightRequest([{ estado: 'esperando_pago' }], now, 0), false);
  assert.equal(hasInFlightRequest([{ estado: 'completado' }, { estado: 'expirado' }], now, 0), false);
  assert.equal(hasInFlightRequest([{ estado: 'pendiente' }], now, 0), true);
  assert.equal(hasInFlightRequest([{ estado: 'procesando' }], now, 0), true);
});

test('al volver del pago se consulta seguido sólo durante la ventana de espera', () => {
  const now = 1_000_000;
  const items = [{ estado: 'esperando_pago' }];
  assert.equal(hasInFlightRequest(items, now, now + 90_000), true);
  assert.equal(hasInFlightRequest(items, now + 90_001, now + 90_000), false);
});

test('la frecuencia de consulta se espacia con la edad del pedido', () => {
  assert.equal(pollDelayForAge(0), 1000);
  assert.equal(pollDelayForAge(9_999), 1000);
  assert.equal(pollDelayForAge(10_000), 3000);
  assert.equal(pollDelayForAge(30_000), 10000);
});

test('las fechas de solo día se muestran como el día calendario, sin correrse por zona horaria', () => {
  assert.equal(formatDay('2026-12-09', 'en-CA'), '2026-12-09');
  assert.equal(formatDay('2026-12-09T00:00:00.000Z', 'en-CA'), '2026-12-09');
  assert.equal(formatDay(null), '');
  assert.equal(formatDay('2026-12-09', 'es-AR'), new Date(2026, 11, 9).toLocaleDateString('es-AR'));
});

test('el total a pagar se muestra con su moneda', () => {
  assert.equal(formatCharge({ monto: '12.08', moneda: 'USD' }, 'en-US'), '12.08 USD');
  assert.equal(formatCharge(undefined), '');
});
