// GPAP connectivity test matrix — runs all 6 cases (3 amounts x Visa/Mastercard)
// against the CyberSource sandbox and checks each against its expected reason code
// and the cardholder message our mapper would render.
//
//   CYBS_SA_PROFILE_ID=... CYBS_SA_ACCESS_KEY=... CYBS_SA_SECRET_KEY=... \
//     node scripts/sa-matrix.mjs

import { buildSignedRequestFields, verifyResponseSignature } from '../supabase/functions/_shared/payments/secure-acceptance.ts';
import { confirmationFor } from '../supabase/functions/_shared/payments/reason-codes.ts';

const PROFILE_ID = process.env.CYBS_SA_PROFILE_ID;
const ACCESS_KEY = process.env.CYBS_SA_ACCESS_KEY;
const SECRET_KEY = process.env.CYBS_SA_SECRET_KEY;
const ENDPOINT = process.env.CYBS_SA_ENDPOINT || 'https://testsecureacceptance.cybersource.com/silent/pay';

if (!PROFILE_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error('Missing CYBS_SA_PROFILE_ID / ACCESS_KEY / SECRET_KEY');
  process.exit(1);
}

const CARDS = {
  Visa: { number: '4000000000002503', type: '001' },
  Mastercard: { number: '5200000000002151', type: '002' },
};

// GPAP test plan: amount drives the outcome.
const CASES = [
  { case: 1, amount: '10', expected: 100 },
  { case: 2, amount: '4091', expected: 150 },
  { case: 3, amount: '4051', expected: 204 },
];

async function run(cardName, card, amount) {
  const referenceNumber = 'CT' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1e4);
  const fields = await buildSignedRequestFields(
    {
      accessKey: ACCESS_KEY,
      profileId: PROFILE_ID,
      transactionUuid: crypto.randomUUID(),
      signedDateTime: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      locale: 'en',
      transactionType: 'sale',
      referenceNumber,
      amount,
      currency: 'HKD',
      paymentMethod: 'card',
      billTo: { forename: 'Test', surname: 'User', email: 'test@example.com' },
    },
    SECRET_KEY,
  );

  const body = new URLSearchParams({
    ...fields,
    card_type: card.type,
    card_number: card.number,
    card_expiry_date: '12-2030',
    card_cvn: '123',
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
    decision: resp.decision ?? '?',
    reason,
    message: resp.message ?? '',
    sigOk,
    rendered: Number.isFinite(reason) ? confirmationFor(reason, referenceNumber).message : '(no reason code)',
  };
}

console.log(`endpoint: ${ENDPOINT}`);
console.log(`profile:  ${PROFILE_ID}\n`);

let pass = 0, fail = 0;
for (const c of CASES) {
  for (const [name, card] of Object.entries(CARDS)) {
    const r = await run(name, card, c.amount);
    const ok = r.reason === c.expected;
    ok ? pass++ : fail++;
    console.log(`Case ${c.case} · ${name.padEnd(10)} · HK$${c.amount.padEnd(5)} → reason ${String(r.reason).padEnd(4)} expected ${String(c.expected).padEnd(4)} ${ok ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   decision=${r.decision} sig=${r.sigOk ? 'ok' : 'BAD'} ref=${r.referenceNumber}`);
    if (r.message) console.log(`   gateway: ${r.message}`);
    console.log(`   we show: ${r.rendered}\n`);
  }
}
console.log(`──────── ${pass} passed, ${fail} failed of ${pass + fail} ────────`);
