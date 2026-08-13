import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  buildDataToSign,
  hmacSha256Base64,
  buildSignedRequestFields,
  verifyResponseSignature,
} from './secure-acceptance.ts';

const SECRET = 'test_secret_key_abc123';

const baseInput = {
  accessKey: 'AK',
  profileId: 'PID',
  transactionUuid: 'uuid-1',
  signedDateTime: '2026-07-15T09:00:00Z',
  locale: 'en',
  transactionType: 'sale' as const,
  referenceNumber: '0000000123',
  amount: '10.00',
  currency: 'HKD',
  paymentMethod: 'card',
  billTo: { forename: 'Test', surname: 'User', email: 'test@example.com' },
};

test('buildDataToSign joins name=value pairs in signed_field_names order', () => {
  const fields = {
    access_key: 'AK',
    profile_id: 'PID',
    signed_field_names: 'access_key,profile_id,amount',
    amount: '10.00',
  };
  assert.equal(buildDataToSign(fields), 'access_key=AK,profile_id=PID,amount=10.00');
});

test('hmacSha256Base64 matches a Node crypto known-answer (cross-impl check)', async () => {
  const data = 'access_key=AK,amount=10.00';
  const expected = createHmac('sha256', SECRET).update(data).digest('base64');
  assert.equal(await hmacSha256Base64(SECRET, data), expected);
});

test('buildSignedRequestFields produces a self-verifying signed field set', async () => {
  const fields = await buildSignedRequestFields(baseInput, SECRET);

  assert.equal(fields.transaction_type, 'sale');
  assert.equal(fields.currency, 'HKD');
  // payment_method is required by CyberSource and must be signed
  assert.equal(fields.payment_method, 'card');
  assert.ok(fields.signed_field_names.includes('payment_method'));
  // bill_to name + email are required for card transactions and are signed server-side
  assert.equal(fields.bill_to_email, 'test@example.com');
  assert.ok(fields.signed_field_names.includes('bill_to_forename'));
  assert.ok(fields.signed_field_names.includes('bill_to_surname'));
  assert.ok(fields.signed_field_names.includes('bill_to_email'));
  assert.ok(fields.signature, 'signature is set');
  // card fields are never signed and never added server-side
  assert.ok(fields.unsigned_field_names.includes('card_number'));
  assert.ok(fields.unsigned_field_names.includes('card_cvn'));
  assert.ok(!fields.signed_field_names.includes('card_number'));
  assert.equal(await verifyResponseSignature(fields, SECRET), true);
});

test('verifyResponseSignature rejects a tampered signed field', async () => {
  const fields = await buildSignedRequestFields(
    { ...baseInput, transactionType: 'authorization' },
    SECRET,
  );
  const tampered = { ...fields, amount: '9999.00' };
  assert.equal(await verifyResponseSignature(tampered, SECRET), false);
});

test('verifyResponseSignature rejects a tampered bill_to field', async () => {
  const fields = await buildSignedRequestFields(baseInput, SECRET);
  const tampered = { ...fields, bill_to_email: 'attacker@evil.com' };
  assert.equal(await verifyResponseSignature(tampered, SECRET), false);
});

test('verifyResponseSignature rejects a wrong secret key', async () => {
  const fields = await buildSignedRequestFields(baseInput, SECRET);
  assert.equal(await verifyResponseSignature(fields, 'wrong_secret'), false);
});

// ── Billing address (UnionPay / Hosted Checkout profile) ──
// The …204 profile is Hosted Checkout, so CyberSource rejects an authorization
// without a billing address: reason_code 101, missingField [bill_address1,
// bill_city, bill_country]. …200 is a Checkout API profile and must NOT start
// sending these — an empty signed field is a new way to fail.

const ADDRESS = { addressLine1: '1 Queens Road Central', city: 'Hong Kong', country: 'HK' };

test('a Visa/Mastercard sign is unchanged — no billing-address fields at all', async () => {
  const fields = await buildSignedRequestFields(baseInput, SECRET);
  for (const n of ['bill_to_address_line1', 'bill_to_address_city', 'bill_to_address_country']) {
    assert.ok(!fields.signed_field_names.includes(n), `${n} must not be signed`);
    assert.ok(!fields.unsigned_field_names.includes(n), `${n} must not be unsigned`);
    assert.equal(fields[n], undefined);
  }
});

test('an order that carries an address signs it, and still verifies', async () => {
  const fields = await buildSignedRequestFields(
    { ...baseInput, billTo: { ...baseInput.billTo, ...ADDRESS } },
    SECRET,
  );
  assert.equal(fields.bill_to_address_line1, '1 Queens Road Central');
  assert.equal(fields.bill_to_address_city, 'Hong Kong');
  assert.equal(fields.bill_to_address_country, 'HK');
  assert.ok(fields.signed_field_names.endsWith('bill_to_address_line1,bill_to_address_city,bill_to_address_country'));
  // Signed, so it cannot be swapped in flight.
  assert.ok(!fields.unsigned_field_names.includes('bill_to_address_line1'));
  assert.equal(await verifyResponseSignature(fields, SECRET), true);
});

test('UnionPay with no stored address declares the fields UNSIGNED so the form collects them', async () => {
  const fields = await buildSignedRequestFields({ ...baseInput, requireBillingAddress: true }, SECRET);
  for (const n of ['bill_to_address_line1', 'bill_to_address_city', 'bill_to_address_country']) {
    assert.ok(fields.unsigned_field_names.includes(n), `${n} must be unsigned`);
    assert.ok(!fields.signed_field_names.includes(n), `${n} must not also be signed`);
  }
  // Card fields must survive alongside them.
  assert.ok(fields.unsigned_field_names.startsWith('card_type,card_number,card_expiry_date,card_cvn'));
  // unsigned_field_names is itself signed, so the browser cannot widen the set.
  assert.ok(fields.signed_field_names.includes('unsigned_field_names'));
  assert.equal(await verifyResponseSignature(fields, SECRET), true);
});

test('a stored address wins over the browser even when UnionPay asks for one', async () => {
  const fields = await buildSignedRequestFields(
    { ...baseInput, requireBillingAddress: true, billTo: { ...baseInput.billTo, ...ADDRESS } },
    SECRET,
  );
  assert.ok(!fields.unsigned_field_names.includes('bill_to_address_line1'));
  assert.ok(fields.signed_field_names.includes('bill_to_address_line1'));
});

test('a PARTIAL address is dropped, never half-signed', async () => {
  // Signing an empty bill_to_address_city just moves the 101 to a different
  // field; falling back to browser collection actually fixes it.
  const fields = await buildSignedRequestFields(
    { ...baseInput, requireBillingAddress: true, billTo: { ...baseInput.billTo, addressLine1: 'x', city: '  ' } },
    SECRET,
  );
  assert.ok(!fields.signed_field_names.includes('bill_to_address_line1'));
  assert.ok(fields.unsigned_field_names.includes('bill_to_address_line1'));
});

// ── Hosted Checkout (UnionPay …204) ──
// Hosted collects the card on CyberSource's page. Every name in
// unsigned_field_names must be PRESENT in the POST, so declaring card fields we
// will never send makes the gateway answer 403 on every endpoint.

test('hosted declares NO unsigned fields at all', async () => {
  const f = await buildSignedRequestFields(
    { ...baseInput, integration: 'hosted', requireBillingAddress: true },
    SECRET,
  );
  assert.equal(f.unsigned_field_names, '');
  assert.equal(f.signed_field_names.includes('bill_to_address_line1'), false);
});

test('hosted still signs an address the order already carries (prefills the hosted page)', async () => {
  const f = await buildSignedRequestFields(
    {
      ...baseInput,
      integration: 'hosted',
      billTo: { ...baseInput.billTo, addressLine1: '1 Connaught Road Central', city: 'Central', country: 'HK' },
    },
    SECRET,
  );
  assert.equal(f.unsigned_field_names, '');
  assert.equal(f.signed_field_names.includes('bill_to_address_line1'), true);
  assert.equal(await verifyResponseSignature(f, SECRET), true);
});

test('hosted signatures still verify', async () => {
  const f = await buildSignedRequestFields({ ...baseInput, integration: 'hosted' }, SECRET);
  assert.equal(await verifyResponseSignature(f, SECRET), true);
});

test('switching UnionPay to hosted did NOT change the Visa/Mastercard field set', async () => {
  // The …200 connectivity test already passed on this exact signature. Any drift
  // here silently invalidates it.
  const explicit = await buildSignedRequestFields({ ...baseInput, integration: 'checkout_api' }, SECRET);
  const defaulted = await buildSignedRequestFields({ ...baseInput }, SECRET);
  assert.equal(explicit.unsigned_field_names, 'card_type,card_number,card_expiry_date,card_cvn');
  assert.deepEqual(explicit, defaulted);
});
