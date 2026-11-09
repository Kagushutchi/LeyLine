import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockForFailure, classifySubmissionFailure } from '../src/modules/suscripciones/store/solicitudes.logic.ts';
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
