import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canApply, assertCanApply, statusAfter } from './order-state.ts';

test('capture is allowed only from authorized', () => {
  assert.equal(canApply('capture', 'authorized'), true);
  assert.equal(canApply('capture', 'paid'), false);
  assert.equal(canApply('capture', 'captured'), false);
});

test('void is allowed pre-settlement (authorized or paid)', () => {
  assert.equal(canApply('void', 'authorized'), true);
  assert.equal(canApply('void', 'paid'), true);
  assert.equal(canApply('void', 'refunded'), false);
});

test('reversal releases an authorization hold', () => {
  assert.equal(canApply('reversal', 'authorized'), true);
  assert.equal(canApply('reversal', 'captured'), false);
});

test('refund is allowed post-settlement (captured, paid, or partially_refunded)', () => {
  assert.equal(canApply('refund', 'captured'), true);
  assert.equal(canApply('refund', 'paid'), true);
  assert.equal(canApply('refund', 'partially_refunded'), true);
  assert.equal(canApply('refund', 'authorized'), false);
  assert.equal(canApply('refund', 'refunded'), false);
});

test('statusAfter maps a back-office action to its resulting status', () => {
  assert.equal(statusAfter('capture'), 'captured');
  assert.equal(statusAfter('void'), 'voided');
  assert.equal(statusAfter('reversal'), 'reversed');
});

test('assertCanApply throws on an illegal transition', () => {
  assert.throws(() => assertCanApply('capture', 'declined'));
  assert.doesNotThrow(() => assertCanApply('refund', 'captured'));
});
