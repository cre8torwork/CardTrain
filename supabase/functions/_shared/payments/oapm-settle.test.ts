import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paymentOutcomeFor, refundOutcomeFor } from './oapm-settle.ts';

test('paymentOutcomeFor: TRADE_SUCCESS is the only paid outcome', () => {
  assert.equal(paymentOutcomeFor('TRADE_SUCCESS'), 'paid');
});

test('paymentOutcomeFor: TRADE_FAIL and TRADE_CLOSED are declined', () => {
  assert.equal(paymentOutcomeFor('TRADE_FAIL'), 'declined');
  assert.equal(paymentOutcomeFor('TRADE_CLOSED'), 'declined');
});

test('paymentOutcomeFor: TRADE_PROCESSING and unknown/empty values are pending (no terminal claim)', () => {
  assert.equal(paymentOutcomeFor('TRADE_PROCESSING'), 'pending');
  assert.equal(paymentOutcomeFor('SOMETHING_UNEXPECTED'), 'pending');
  assert.equal(paymentOutcomeFor(''), 'pending');
});

test('refundOutcomeFor: TRADE_REFUND is a partial refund', () => {
  assert.equal(refundOutcomeFor('TRADE_REFUND'), 'partial');
});

test('refundOutcomeFor: TRADE_CLOSED is a full refund', () => {
  assert.equal(refundOutcomeFor('TRADE_CLOSED'), 'full');
});

test('refundOutcomeFor: TRADE_FAIL fails the refund', () => {
  assert.equal(refundOutcomeFor('TRADE_FAIL'), 'fail');
});

test('refundOutcomeFor: TRADE_PROCESSING and APPLY_SUCCESS are still processing (no order mutation yet)', () => {
  assert.equal(refundOutcomeFor('TRADE_PROCESSING'), 'processing');
  assert.equal(refundOutcomeFor('APPLY_SUCCESS'), 'processing');
});
