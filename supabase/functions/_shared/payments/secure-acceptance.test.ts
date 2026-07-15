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
  const fields = await buildSignedRequestFields(
    {
      accessKey: 'AK',
      profileId: 'PID',
      transactionUuid: 'uuid-1',
      signedDateTime: '2026-07-15T09:00:00Z',
      locale: 'en',
      transactionType: 'sale',
      referenceNumber: '0000000123',
      amount: '10.00',
      currency: 'HKD',
    },
    SECRET,
  );

  assert.equal(fields.transaction_type, 'sale');
  assert.equal(fields.currency, 'HKD');
  assert.ok(fields.signature, 'signature is set');
  // card fields are never signed and never added server-side
  assert.ok(fields.unsigned_field_names.includes('card_number'));
  assert.ok(fields.unsigned_field_names.includes('card_cvn'));
  assert.ok(!fields.signed_field_names.includes('card_number'));
  assert.equal(await verifyResponseSignature(fields, SECRET), true);
});

test('verifyResponseSignature rejects a tampered signed field', async () => {
  const fields = await buildSignedRequestFields(
    {
      accessKey: 'AK',
      profileId: 'PID',
      transactionUuid: 'uuid-1',
      signedDateTime: '2026-07-15T09:00:00Z',
      locale: 'en',
      transactionType: 'authorization',
      referenceNumber: '0000000123',
      amount: '10.00',
      currency: 'HKD',
    },
    SECRET,
  );

  const tampered = { ...fields, amount: '9999.00' };
  assert.equal(await verifyResponseSignature(tampered, SECRET), false);
});

test('verifyResponseSignature rejects a wrong secret key', async () => {
  const fields = await buildSignedRequestFields(
    {
      accessKey: 'AK',
      profileId: 'PID',
      transactionUuid: 'uuid-1',
      signedDateTime: '2026-07-15T09:00:00Z',
      locale: 'en',
      transactionType: 'sale',
      referenceNumber: '0000000123',
      amount: '10.00',
      currency: 'HKD',
    },
    SECRET,
  );

  assert.equal(await verifyResponseSignature(fields, 'wrong_secret'), false);
});
