import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMinorUnits, formatMinorUnits, ctpForHkd } from './money.ts';

test('toMinorUnits converts whole HKD dollars to cents', () => {
  assert.equal(toMinorUnits(50), 5000);
  assert.equal(toMinorUnits(1000), 100000);
});

test('toMinorUnits handles cents without float drift', () => {
  // 9000.91 is a GPAP test amount; naive 9000.91*100 === 900090.9999...
  assert.equal(toMinorUnits(9000.91), 900091);
  assert.equal(toMinorUnits(4051), 405100);
});

test('toMinorUnits rejects negative or non-finite amounts', () => {
  assert.throws(() => toMinorUnits(-1));
  assert.throws(() => toMinorUnits(Number.NaN));
  assert.throws(() => toMinorUnits(Number.POSITIVE_INFINITY));
});

test('formatMinorUnits renders cents as a 2dp HKD string', () => {
  assert.equal(formatMinorUnits(5000), '50.00');
  assert.equal(formatMinorUnits(900091), '9000.91');
  assert.equal(formatMinorUnits(0), '0.00');
});

test('ctpForHkd credits 10 points per HKD dollar', () => {
  assert.equal(ctpForHkd(50), 500);
  assert.equal(ctpForHkd(5000), 50000);
});
