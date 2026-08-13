// GPAP connectivity test matrix — China UnionPay (MID gphk088034609204).
//
// The UnionPay sibling of sa-matrix.mjs. Two things differ from Visa/Mastercard,
// and both are why this needed its own script rather than a flag:
//
//   1. Different merchant, different credentials. …204 has its own Secure
//      Acceptance profile, so it needs CYBS_SA_CUP_* — signing a UnionPay card
//      with the …200 profile returns reason_code 102 and creates no transaction
//      at all, so there is nothing to trace in the Business Center.
//   2. …204 is a HOSTED CHECKOUT profile (…200 is Checkout API). A hosted profile
//      collects the billing address on its own page and therefore makes it
//      mandatory; posting to /silent/pay skips the page but not the requirement.
//      Without an address the authorization dies at reason_code 101 naming
//      `bill_address1, bill_city, bill_country`. So this script SIGNS the three
//      bill_to_address_* fields, which is the same path a shop order takes.
//
// The test amounts carry cents (9000.91, 9000.51) — that is the whole point of
// the exercise, and it is why nothing in the Buy Points UI can produce them:
// custom points take whole CTP and divide by 10, so HKD never gets past one
// decimal place. This script bypasses order creation entirely and signs the
// amount directly, so no product change is needed to prove the gateway.
//
//   CYBS_SA_CUP_PROFILE_ID=... CYBS_SA_CUP_ACCESS_KEY=... CYBS_SA_CUP_SECRET_KEY=... \
//     SA_CUP_CARD=<GPAP UnionPay test card> node scripts/sa-cup-matrix.mjs

import { buildSignedRequestFields, verifyResponseSignature } from '../supabase/functions/_shared/payments/secure-acceptance.ts';
import { confirmationFor } from '../supabase/functions/_shared/payments/reason-codes.ts';

const PROFILE_ID = process.env.CYBS_SA_CUP_PROFILE_ID;
const ACCESS_KEY = process.env.CYBS_SA_CUP_ACCESS_KEY;
const SECRET_KEY = process.env.CYBS_SA_CUP_SECRET_KEY;
const ENDPOINT = process.env.CYBS_SA_CUP_ENDPOINT
  || process.env.CYBS_SA_ENDPOINT
  || 'https://testsecureacceptance.cybersource.com/silent/pay';

// Points top-ups are instant fulfilment, so the live flow signs a `sale`
// (see order-kind.ts). Override to `authorization` to mirror the shop path.
const TXN_TYPE = process.env.SA_CUP_TXN_TYPE || 'sale';

// GPAP issues the UnionPay test card with the connectivity test plan. There is no
// safe default — an invented PAN either fails Luhn or hits an unrelated decline,
// and either way the run says nothing about the amounts.
const CARD = (process.env.SA_CUP_CARD || '').replace(/\D/g, '');
const CARD_TYPE = process.env.SA_CUP_CARD_TYPE || '062'; // 062 = China UnionPay
const CARD_EXPIRY = process.env.SA_CUP_CARD_EXPIRY || '12-2030';
const CARD_CVN = process.env.SA_CUP_CARD_CVN || '123';

// The …204 profile makes these mandatory. Signed here (not left unsigned) because
// this script has no browser to collect them.
const BILL_ADDRESS = process.env.SA_CUP_ADDRESS || '1 Connaught Road Central';
const BILL_CITY = process.env.SA_CUP_CITY || 'Central';
const BILL_COUNTRY = process.env.SA_CUP_COUNTRY || 'HK';

if (!PROFILE_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error('Missing CYBS_SA_CUP_PROFILE_ID / _ACCESS_KEY / _SECRET_KEY (UnionPay MID …204).');
  console.error('These are the …204 credentials — the …200 CYBS_SA_* set will return reason 102.');
  process.exit(1);
}
if (!CARD) {
  console.error('Missing SA_CUP_CARD — set it to the UnionPay test card from GPAP\'s test plan.');
  process.exit(1);
}

// Amounts are the trigger, exactly as in the Visa/Mastercard plan. The two cases
// and their expected reason codes are GPAP's, confirmed by the owner 2026-08-13:
//   HK$9000.91 → 150   HK$9000.51 → 204
// Format: SA_CUP_CASES="9000.91:150,9000.51:204"; an entry with no expected code
// (e.g. "9000.91") is reported without a verdict.
const DEFAULT_CASES = '9000.91:150,9000.51:204';
const CASES = (process.env.SA_CUP_CASES || DEFAULT_CASES).split(',').map((entry, i) => {
  const [amount, expected] = entry.trim().split(':');
  return {
    case: i + 1,
    amount: amount.trim(),
    expected: expected ? Number(expected) : null,
  };
});

async function run(amount) {
  const referenceNumber = 'CT' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1e4);
  const fields = await buildSignedRequestFields(
    {
      accessKey: ACCESS_KEY,
      profileId: PROFILE_ID,
      transactionUuid: crypto.randomUUID(),
      signedDateTime: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      locale: 'en',
      transactionType: TXN_TYPE,
      referenceNumber,
      amount,
      currency: 'HKD',
      paymentMethod: 'card',
      billTo: {
        forename: 'Test',
        surname: 'User',
        email: 'test@example.com',
        addressLine1: BILL_ADDRESS,
        city: BILL_CITY,
        country: BILL_COUNTRY,
      },
    },
    SECRET_KEY,
  );

  const body = new URLSearchParams({
    ...fields,
    card_type: CARD_TYPE,
    card_number: CARD,
    card_expiry_date: CARD_EXPIRY,
    card_cvn: CARD_CVN,
  });

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    redirect: 'manual',
  });
  const text = await res.text();

  const resp = {};
  for (const tag of text.match(/<input[^>]*>/g) || []) {
    const n = tag.match(/name="([^"]+)"/)?.[1];
    const v = tag.match(/value="([^"]*)"/)?.[1];
    if (n) resp[n] = v ?? '';
  }
  const reason = Number(resp.reason_code);
  const sigOk = resp.signature ? await verifyResponseSignature(resp, SECRET_KEY) : false;
  return {
    referenceNumber,
    // A hosted profile answers a /silent/pay POST it dislikes with a 302 to its own
    // page rather than a field set — surface that instead of a silent blank row.
    redirectedTo: res.status >= 300 && res.status < 400 ? res.headers.get('location') : null,
    status: res.status,
    decision: resp.decision ?? '?',
    reason,
    // Named when the reject is a validation failure (101 = missing, 102 = invalid).
    missing: resp.missing_fields ?? '',
    invalid: resp.invalid_fields ?? '',
    echoedAmount: resp.req_amount ?? '',
    message: resp.message ?? '',
    sigOk,
    rendered: Number.isFinite(reason) ? confirmationFor(reason, referenceNumber).message : '(no reason code)',
  };
}

console.log(`endpoint: ${ENDPOINT}`);
console.log(`profile:  ${PROFILE_ID}  (UnionPay MID …204)`);
console.log(`card:     ${CARD.slice(0, 6)}…${CARD.slice(-4)}  type=${CARD_TYPE}  txn=${TXN_TYPE}\n`);
let pass = 0, fail = 0, unverified = 0;
for (const c of CASES) {
  const r = await run(c.amount);
  let verdict;
  if (c.expected === null) {
    unverified++;
    verdict = 'ℹ️  no expectation set';
  } else if (r.reason === c.expected) {
    pass++;
    verdict = '✅ PASS';
  } else {
    fail++;
    verdict = '❌ FAIL';
  }
  console.log(`Case ${c.case} · UnionPay · HK$${c.amount.padEnd(8)} → reason ${String(r.reason).padEnd(4)} expected ${String(c.expected ?? '—').padEnd(4)} ${verdict}`);
  console.log(`   decision=${r.decision} http=${r.status} sig=${r.sigOk ? 'ok' : 'BAD'} ref=${r.referenceNumber}`);
  // Proves the cents survived signing and round-tripped — the actual question here.
  if (r.echoedAmount) console.log(`   gateway echoed amount: ${r.echoedAmount}`);
  if (r.redirectedTo) console.log(`   ⚠️  redirected to ${r.redirectedTo} — hosted profile refused the Checkout API post`);
  if (r.missing) console.log(`   ⚠️  missing_fields: ${r.missing}`);
  if (r.invalid) console.log(`   ⚠️  invalid_fields: ${r.invalid}`);
  if (r.message) console.log(`   gateway: ${r.message}`);
  console.log(`   we show: ${r.rendered}\n`);
}
console.log(`──────── ${pass} passed, ${fail} failed, ${unverified} unverified of ${CASES.length} ────────`);
