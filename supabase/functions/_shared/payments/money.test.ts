import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMinorUnits, formatMinorUnits, ctpForHkd } from './money.ts';

test('toMinorUnits converts whole HKD dollars to cents', () => {
  assert.equal(toMinorUnits(50), 5000);
  assert.equal(toMinorUnits(1000), 100000);
});

test('toMinorUnits handles cents without float drift', () => {
  // Amounts that genuinely lose exactness under a naive *100 — this is what the
  // Math.round is for. 0.29*100 === 28.999999999999996 (truncation would bill 28
  // cents); 16.1 is reachable from the custom-points path as 161 CTP / 10, and
  // 16.1*100 === 1610.0000000000002.
  assert.equal(toMinorUnits(0.29), 29);
  assert.equal(toMinorUnits(16.1), 1610);
  assert.equal(toMinorUnits(4051), 405100);
});

test('toMinorUnits carries the GPAP UnionPay test amounts to exact cents', () => {
  // The …204 connectivity test is driven by amounts whose CENTS are the trigger,
  // so a half-cent slip changes which case the gateway thinks it is running.
  assert.equal(toMinorUnits(9000.91), 900091);
  assert.equal(toMinorUnits(9000.51), 900051);
});

test('toMinorUnits rejects negative or non-finite amounts', () => {
  assert.throws(() => toMinorUnits(-1));
  assert.throws(() => toMinorUnits(Number.NaN));
  assert.throws(() => toMinorUnits(Number.POSITIVE_INFINITY));
});

test('formatMinorUnits renders cents as a 2dp HKD string', () => {
  assert.equal(formatMinorUnits(5000), '50.00');
  // The exact strings the UnionPay connectivity test has to sign and send.
  assert.equal(formatMinorUnits(900091), '9000.91');
  assert.equal(formatMinorUnits(900051), '9000.51');
  assert.equal(formatMinorUnits(0), '0.00');
});

test('ctpForHkd credits 10 points per HKD dollar', () => {
  assert.equal(ctpForHkd(50), 500);
  assert.equal(ctpForHkd(5000), 50000);
});
