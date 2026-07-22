// Secure Acceptance sandbox smoke test. Signs a Silent Order POST with the tested
// signer and submits it to the CyberSource test endpoint, to verify the signature
// is byte-accepted (the failure mode that is otherwise opaque).
//
// Reads credentials from the environment — nothing is written to disk:
//   CYBS_SA_PROFILE_ID, CYBS_SA_ACCESS_KEY, CYBS_SA_SECRET_KEY
// Optional: CYBS_SA_ENDPOINT (defaults to the test endpoint),
//           SA_AMOUNT (defaults 10.00), SA_CARD (defaults Visa success 2503).
//
//   node scripts/sa-smoke.mjs

import { buildSignedRequestFields, verifyResponseSignature } from '../supabase/functions/_shared/payments/secure-acceptance.ts';

const PROFILE_ID = process.env.CYBS_SA_PROFILE_ID;
const ACCESS_KEY = process.env.CYBS_SA_ACCESS_KEY;
const SECRET_KEY = process.env.CYBS_SA_SECRET_KEY;
const ENDPOINT = process.env.CYBS_SA_ENDPOINT || 'https://testsecureacceptance.cybersource.com/silent/pay';
const AMOUNT = process.env.SA_AMOUNT || '10.00';
const CARD = process.env.SA_CARD || '4000000000002503'; // GPAP Visa test card (X->0)
const CARD_TYPE = process.env.SA_CARD_TYPE || '001'; // 001 Visa, 002 Mastercard
const TXN_TYPE = process.env.SA_TXN_TYPE || 'sale'; // sale | authorization

if (!ACCESS_KEY || !SECRET_KEY) {
  console.error('Missing CYBS_SA_ACCESS_KEY / CYBS_SA_SECRET_KEY');
  process.exit(1);
}
if (!PROFILE_ID) {
  console.warn('⚠️  No CYBS_SA_PROFILE_ID — probing with a placeholder; a real transaction needs the Profile ID.');
}

const signedDateTime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const referenceNumber = 'SMOKE' + Date.now().toString(36).toUpperCase();

const fields = await buildSignedRequestFields(
  {
    accessKey: ACCESS_KEY,
    profileId: PROFILE_ID || 'MISSING_PROFILE_ID',
    transactionUuid: crypto.randomUUID(),
    signedDateTime,
    locale: 'en',
    transactionType: TXN_TYPE,
    referenceNumber,
    amount: AMOUNT,
    currency: 'HKD',
    paymentMethod: 'card',
    billTo: { forename: 'Test', surname: 'User', email: 'test@example.com' },
  },
  SECRET_KEY,
);

const body = new URLSearchParams({
  ...fields,
  card_type: CARD_TYPE,
  card_number: CARD,
  card_expiry_date: '12-2030',
  card_cvn: '123',
});

console.log(`POST ${ENDPOINT}`);
console.log(`reference_number=${referenceNumber} amount=${AMOUNT} card=${CARD}`);

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: body.toString(),
  redirect: 'manual',
});
const text = await res.text();

console.log(`\nHTTP ${res.status}`);
const loc = res.headers.get('location');
if (loc) console.log(`Location: ${loc}`);

// Parse the response form fields (name="X" ... value="Y") back into an object.
const resp = {};
for (const tag of text.match(/<input[^>]*>/g) || []) {
  const name = tag.match(/name="([^"]+)"/)?.[1];
  const value = tag.match(/value="([^"]*)"/)?.[1];
  if (name) resp[name] = value ?? '';
}

console.log(`\ndecision=${resp.decision} reason_code=${resp.reason_code} message=${resp.message ?? ''}`);
console.log(`req_profile_id=${resp.req_profile_id ?? ''} invalid_fields=${resp.invalid_fields ?? '(none)'} auth_avail=${resp.auth_response ?? ''}`);
// Where CyberSource sends its response — must be our checkout-response endpoint.
console.log(`response form action = ${text.match(/<form[^>]*action="([^"]+)"/)?.[1] ?? '(none)'}`);
if (resp.signature && resp.signed_field_names) {
  const ok = await verifyResponseSignature(resp, SECRET_KEY);
  console.log(`response signature verifies with our secret: ${ok ? '✅ YES' : '❌ NO'}`);
} else {
  console.log('(no signed response fields to verify)');
}
