import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPointsPurchase, transactionTypeFor, paidStatusFor } from './order-kind.ts';

test('BOTH points kinds are instant digital fulfilment', () => {
  // Regression: `kind === "buy_points"` missed buy_points_custom, so a
  // custom-amount purchase was authorized (funds held, never captured) and the
  // customer was never credited any CTP.
  assert.equal(isPointsPurchase('buy_points'), true);
  assert.equal(isPointsPurchase('buy_points_custom'), true);
});

test('shop goods ship later, so they are NOT an instant points purchase', () => {
  assert.equal(isPointsPurchase('shop_goods'), false);
});

test('points purchases are a SALE; shop goods are an AUTHORIZATION', () => {
  assert.equal(transactionTypeFor('buy_points'), 'sale');
  assert.equal(transactionTypeFor('buy_points_custom'), 'sale');
  assert.equal(transactionTypeFor('shop_goods'), 'authorization');
});

test('a successful points purchase is paid; shop goods are authorized', () => {
  assert.equal(paidStatusFor('buy_points'), 'paid');
  assert.equal(paidStatusFor('buy_points_custom'), 'paid');
  assert.equal(paidStatusFor('shop_goods'), 'authorized');
});

test('an unknown kind is treated as the safer non-instant path', () => {
  assert.equal(isPointsPurchase('something_new'), false);
  assert.equal(transactionTypeFor('something_new'), 'authorization');
});
