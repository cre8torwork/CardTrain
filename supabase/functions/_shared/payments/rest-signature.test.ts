import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { digestFor, buildSignatureString, signatureHeader } from './rest-signature.ts';

// A Base64 shared secret, as CyberSource issues it.
const SECRET_B64 = Buffer.from('super-secret-key-material').toString('base64');
const KEY_ID = '08a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5';

const params = {
  host: 'apitest.cybersource.com',
  date: 'Tue, 22 Jul 2026 00:00:00 GMT',
  requestTarget: 'post /pts/v2/payments',
  digest: 'SHA-256=abc123==',
  merchantId: 'ctvest',
};

test('digestFor matches Node SHA-256 (cross-impl)', async () => {
  const body = '{"amount":"10.00","currency":"HKD"}';
  const expected = 'SHA-256=' + createHash('sha256').update(body).digest('base64');
  assert.equal(await digestFor(body), expected);
});

test('buildSignatureString is the exact 5-line POST base string', () => {
  assert.equal(
    buildSignatureString(params),
    'host: apitest.cybersource.com\n' +
      'date: Tue, 22 Jul 2026 00:00:00 GMT\n' +
      '(request-target): post /pts/v2/payments\n' +
      'digest: SHA-256=abc123==\n' +
      'v-c-merchant-id: ctvest',
  );
});

test('signature = base64(HMAC-SHA256(baseString, base64decode(secret))) — cross-checked with Node', async () => {
  const header = await signatureHeader(params, KEY_ID, SECRET_B64);
  const sig = header.match(/signature="([^"]+)"/)?.[1];
  const expected = createHmac('sha256', Buffer.from(SECRET_B64, 'base64'))
    .update(buildSignatureString(params))
    .digest('base64');
  assert.equal(sig, expected);
});

test('Signature header carries keyid, algorithm and the signed-header list', async () => {
  const header = await signatureHeader(params, KEY_ID, SECRET_B64);
  assert.ok(header.includes(`keyid="${KEY_ID}"`));
  assert.ok(header.includes('algorithm="HmacSHA256"'));
  assert.ok(header.includes('headers="host date (request-target) digest v-c-merchant-id"'));
});
