import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePackage } from './packages.ts';

test('resolvePackage returns server-derived minor units and CTP', () => {
  assert.deepEqual(resolvePackage('pkg-300', 1), { amountMinor: 30000, ctp: 3000 });
  assert.deepEqual(resolvePackage('pkg-50', 2), { amountMinor: 10000, ctp: 1000 });
});

test('resolvePackage rejects an unknown package id', () => {
  assert.throws(() => resolvePackage('pkg-999', 1));
});

test('resolvePackage rejects a non-integer or out-of-range quantity', () => {
  assert.throws(() => resolvePackage('pkg-50', 0));
  assert.throws(() => resolvePackage('pkg-50', -1));
  assert.throws(() => resolvePackage('pkg-50', 1.5));
  assert.throws(() => resolvePackage('pkg-50', 101));
});
