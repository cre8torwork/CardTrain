import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRefund } from './refunds.ts';

test('a full refund marks the order refunded', () => {
  assert.deepEqual(computeRefund(30000, 0, 30000), { refundedMinor: 30000, status: 'refunded' });
});

test('a partial refund accumulates and stays partially_refunded', () => {
  assert.deepEqual(computeRefund(30000, 0, 10000), { refundedMinor: 10000, status: 'partially_refunded' });
  assert.deepEqual(computeRefund(30000, 10000, 5000), { refundedMinor: 15000, status: 'partially_refunded' });
});

test('accumulated partials that reach the captured total mark it refunded', () => {
  assert.deepEqual(computeRefund(30000, 20000, 10000), { refundedMinor: 30000, status: 'refunded' });
});

test('a refund that would exceed the captured amount is rejected', () => {
  assert.throws(() => computeRefund(30000, 20000, 10001));
  assert.throws(() => computeRefund(30000, 30000, 1));
});

test('a non-positive or non-integer refund is rejected', () => {
  assert.throws(() => computeRefund(30000, 0, 0));
  assert.throws(() => computeRefund(30000, 0, -100));
  assert.throws(() => computeRefund(30000, 0, 1.5));
});
