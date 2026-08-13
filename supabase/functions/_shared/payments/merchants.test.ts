import { test } from 'node:test';
import assert from 'node:assert/strict';
import { merchantForNetwork, networkForCardType, merchantForProfileId, configuredMerchants, hostedEndpointFrom, CARD_NETWORK } from './merchants.ts';

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

test('a response is matched back to its merchant by req_profile_id', () => {
  // checkout-response must verify the signature with the SAME secret CyberSource
  // signed with. Verifying a UnionPay response with the …200 secret fails and the
  // customer sees "We could not verify this transaction" after paying.
  assert.equal(merchantForProfileId('profile-204', ENV)?.merchantId, 'gphk088034609204');
  assert.equal(merchantForProfileId('profile-200', ENV)?.merchantId, 'gphk088034609200');
  assert.equal(merchantForProfileId('unknown-profile', ENV), null);
});

test('configuredMerchants lists every merchant that has credentials', () => {
  assert.deepEqual(configuredMerchants(ENV).map((m) => m.merchantId).sort(), [
    'gphk088034609200',
    'gphk088034609204',
  ]);
  // UnionPay unconfigured -> only the default merchant, and no throw.
  assert.deepEqual(
    configuredMerchants({ ...ENV, CYBS_SA_CUP_SECRET_KEY: '' }).map((m) => m.merchantId),
    ['gphk088034609200'],
  );
});

// ── Integration method (the GPAP "Client Application" requirement) ──
// CyberSource records the integration against every transaction. GPAP requires
// UnionPay to read "Secure Acceptance Hosted Checkout"; sharing the Visa/MC
// endpoint is what made it read "Secure Acceptance SOP".

const SA_ENV = { ...ENV, CYBS_SA_ENDPOINT: 'https://testsecureacceptance.cybersource.com/silent/pay' };

test('UnionPay runs Hosted Checkout on /pay; Visa/MC stays on Checkout API', () => {
  const cup = merchantForNetwork(CARD_NETWORK.unionPay, SA_ENV);
  assert.equal(cup.integration, 'hosted');
  assert.equal(cup.endpoint, 'https://testsecureacceptance.cybersource.com/pay');

  for (const n of [CARD_NETWORK.visa, CARD_NETWORK.mastercard]) {
    const m = merchantForNetwork(n, SA_ENV);
    assert.equal(m.integration, 'checkout_api', n);
    assert.equal(m.endpoint, 'https://testsecureacceptance.cybersource.com/silent/pay', n);
  }
});

test('the hosted endpoint is derived from the base, so no second env var is required', () => {
  assert.equal(
    hostedEndpointFrom('https://secureacceptance.cybersource.com/silent/pay'),
    'https://secureacceptance.cybersource.com/pay',
  );
  // Already hosted, or an unexpected shape — leave it alone rather than mangle it.
  assert.equal(
    hostedEndpointFrom('https://secureacceptance.cybersource.com/pay'),
    'https://secureacceptance.cybersource.com/pay',
  );
});

test('an explicit CYBS_SA_CUP_ENDPOINT overrides the derived one', () => {
  const m = merchantForNetwork(CARD_NETWORK.unionPay, {
    ...SA_ENV,
    CYBS_SA_CUP_ENDPOINT: 'https://secureacceptance.cybersource.com/pay',
  });
  assert.equal(m.endpoint, 'https://secureacceptance.cybersource.com/pay');
});

test('configuredMerchants carries each merchant its own endpoint + integration', () => {
  const byMid = Object.fromEntries(configuredMerchants(SA_ENV).map((m) => [m.merchantId, m]));
  assert.equal(byMid['gphk088034609204'].integration, 'hosted');
  assert.equal(byMid['gphk088034609204'].endpoint.endsWith('/pay'), true);
  assert.equal(byMid['gphk088034609200'].integration, 'checkout_api');
  assert.equal(byMid['gphk088034609200'].endpoint.endsWith('/silent/pay'), true);
});
