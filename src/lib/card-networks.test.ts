import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectCardType, CARD_TYPE } from './card-networks.ts';

test('Visa cards map to CyberSource card_type 001', () => {
  for (const n of ['4000000000002503', '4111111111111111']) {
    assert.equal(detectCardType(n), CARD_TYPE.visa, n);
  }
});

test('Mastercard maps to 002 — both the 51-55 and 2221-2720 ranges', () => {
  for (const n of ['5200000000002151', '5555555555554444', '2221000000000009']) {
    assert.equal(detectCardType(n), CARD_TYPE.mastercard, n);
  }
});

test('UnionPay maps to 062 (62/81 ranges), only when enabled', () => {
  const up = '6210032578574424'; // GPAP test card, X->0
  assert.equal(detectCardType(up, { unionPay: true }), CARD_TYPE.unionPay);
  assert.equal(detectCardType('8100000000000000', { unionPay: true }), CARD_TYPE.unionPay);
  // Disabled by default: the MID is not provisioned for UnionPay, so accepting the
  // card would only produce reason_code 102 ("not supported by the processor").
  assert.equal(detectCardType(up), undefined);
});

test('spaces and separators are ignored', () => {
  assert.equal(detectCardType('4000 0000 0000 2503'), CARD_TYPE.visa);
  assert.equal(detectCardType('5200-0000-0000-2151'), CARD_TYPE.mastercard);
});

test('unknown networks return undefined (Amex/JCB/Discover are not provisioned)', () => {
  for (const n of ['340000000002534', '3338000000000569', '6011000000000004']) {
    assert.equal(detectCardType(n), undefined, n);
  }
});
