import { test } from 'node:test';
import assert from 'node:assert/strict';
import { merchantForNetwork, networkForCardType, CARD_NETWORK } from './merchants.ts';

const ENV = {
  CYBS_SA_PROFILE_ID: 'profile-200',
  CYBS_SA_ACCESS_KEY: 'access-200',
  CYBS_SA_SECRET_KEY: 'secret-200',
  CYBS_SA_MERCHANT_ID: 'gphk088034609200',
  CYBS_SA_CUP_PROFILE_ID: 'profile-204',
  CYBS_SA_CUP_ACCESS_KEY: 'access-204',
  CYBS_SA_CUP_SECRET_KEY: 'secret-204',
  CYBS_SA_CUP_MERCHANT_ID: 'gphk088034609204',
};

test('Visa and Mastercard route to the default MID (…200)', () => {
  for (const n of [CARD_NETWORK.visa, CARD_NETWORK.mastercard]) {
    const m = merchantForNetwork(n, ENV);
    assert.equal(m.merchantId, 'gphk088034609200', n);
    assert.equal(m.profileId, 'profile-200');
    assert.equal(m.secretKey, 'secret-200');
  }
});

test('UnionPay routes to its OWN MID (…204) with its own credentials', () => {
  const m = merchantForNetwork(CARD_NETWORK.unionPay, ENV);
  assert.equal(m.merchantId, 'gphk088034609204');
  assert.equal(m.profileId, 'profile-204');
  assert.equal(m.accessKey, 'access-204');
  assert.equal(m.secretKey, 'secret-204');
});

test('card_type codes map to networks', () => {
  assert.equal(networkForCardType('001'), CARD_NETWORK.visa);
  assert.equal(networkForCardType('002'), CARD_NETWORK.mastercard);
  assert.equal(networkForCardType('062'), CARD_NETWORK.unionPay);
});

test('an unknown card_type falls back to the default MID, never UnionPay', () => {
  // Signing a UnionPay profile for a Visa card would be rejected by the
  // processor, so anything we cannot identify must use the default merchant.
  assert.equal(networkForCardType('999'), CARD_NETWORK.visa);
  assert.equal(merchantForNetwork(networkForCardType('999'), ENV).merchantId, 'gphk088034609200');
});

test('UnionPay without configured credentials throws — never silently bills the wrong MID', () => {
  // The dangerous failure is signing a UnionPay card with the …200 profile:
  // the processor rejects it with reason 102 and no transaction is created,
  // which is untraceable in the Business Center.
  assert.throws(
    () => merchantForNetwork(CARD_NETWORK.unionPay, { ...ENV, CYBS_SA_CUP_PROFILE_ID: '' }),
    /UnionPay/i,
  );
});

test('the default merchant id falls back to the known cards MID if unset', () => {
  const m = merchantForNetwork(CARD_NETWORK.visa, { ...ENV, CYBS_SA_MERCHANT_ID: '' });
  assert.equal(m.merchantId, 'gphk088034609200');
});
