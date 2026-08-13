// GPAP connectivity test matrix — China UnionPay (…204), driven through the REAL
// order + sign-checkout path.
//
// Where sa-cup-matrix.mjs signs locally from CYBS_SA_CUP_* credentials, this one
// never sees a secret: it seeds an order at an exact `amount_minor`, calls the
// DEPLOYED sign-checkout (which holds the …204 keys server-side), and posts the
// fields it returns. That makes it the stronger test of the two — it exercises
// merchant routing, the order state machine, and the unsigned-billing-address
// mechanism exactly as production does.
//
// It exists because the amounts under test carry cents (9000.91, 9000.51) and
// NOTHING in the Buy Points UI can produce them: custom points take whole CTP and
// divide by 10, so HKD never gets past one decimal place. Seeding the order is
// the only way to put an odd-cent amount in front of the real signer.
//
//   SB_SERVICE=<service_role key> SA_CUP_CARD=<GPAP UnionPay test card> \
//     node scripts/sa-cup-order-matrix.mjs
//
// Leaves the seeded orders in place on purpose — the reference_number on each is
// what gets cross-checked against EBC.

const SB_URL = process.env.SB_URL || 'https://cdsrzczbnbhlmiebxzfb.supabase.co';
const SB_SERVICE = process.env.SB_SERVICE;
const SB_ANON = process.env.SB_ANON;

// sign-checkout resolves bill_to name/email from this user, so it must be a real
// auth user. Defaults to the account the earlier …204 runs used.
const USER_ID = process.env.SA_CUP_USER_ID || '50d58ba1-da4c-4cbf-8ab4-381ed4fba0ab';

const CARD = (process.env.SA_CUP_CARD || '').replace(/\D/g, '');
const CARD_TYPE = process.env.SA_CUP_CARD_TYPE || '062'; // 062 = China UnionPay
const CARD_EXPIRY = process.env.SA_CUP_CARD_EXPIRY || '11-2030'; // MM-YYYY
const CARD_CVN = process.env.SA_CUP_CARD_CVN || '123';

// buy_points_custom orders carry no address, so sign-checkout declares the three
// bill_to_address_* names UNSIGNED for UnionPay and expects the browser to fill
// them. This script is that browser.
const BILL_ADDRESS = process.env.SA_CUP_ADDRESS || '1 Connaught Road Central';
const BILL_CITY = process.env.SA_CUP_CITY || 'Central';
const BILL_COUNTRY = process.env.SA_CUP_COUNTRY || 'HK';

if (!SB_SERVICE) {
  console.error('Missing SB_SERVICE (service_role key) — needed to seed the orders.');
  process.exit(1);
}
if (!CARD) {
  console.error('Missing SA_CUP_CARD — the UnionPay test card from GPAP\'s test plan.');
  process.exit(1);
}

// Amounts are the trigger. GPAP's UnionPay cases, confirmed by the owner 2026-08-13:
//   HK$9000.91 (900091) → reason 150   HK$9000.51 (900051) → reason 204
// Format: "<minor units>:<expected reason>", expectation optional.
const DEFAULT_CASES = '900091:150,900051:204';
const CASES = (process.env.SA_CUP_CASES || DEFAULT_CASES).split(',').map((entry, i) => {
  const [minor, expected] = entry.trim().split(':');
  return { case: i + 1, amountMinor: Number(minor), expected: expected ? Number(expected) : null };
});

const rest = (path, init = {}) =>
  fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_SERVICE,
      Authorization: `Bearer ${SB_SERVICE}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

/** Seed an order at an EXACT minor-unit amount — the step the UI cannot do. */
async function seedOrder(amountMinor) {
  const res = await rest('orders', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: USER_ID,
      kind: 'buy_points_custom',
      amount_minor: amountMinor,
      currency: 'HKD',
      status: 'created',
      // sign-checkout overwrites this with the merchant that actually signs.
      mid: 'gphk088034609204',
      ctp_amount: Math.round((amountMinor / 100) * 10),
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`seed failed (${res.status}): ${JSON.stringify(body)}`);
  return body[0].id;
}

/** Ask the deployed signer for the …204 field set. The secret never leaves the edge. */
async function signOrder(orderId) {
  const res = await fetch(`${SB_URL}/functions/v1/sign-checkout`, {
    method: 'POST',
    headers: {
      apikey: SB_ANON || SB_SERVICE,
      Authorization: `Bearer ${SB_ANON || SB_SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId, network: 'unionpay' }),
  });
  const body = await res.json();
  if (!res.ok || !body.fields) throw new Error(`sign failed (${res.status}): ${JSON.stringify(body)}`);
  return body;
}

async function submit(endpoint, fields) {
  // The customer-supplied fields are only legal if the signer declared them
  // unsigned; adding one it did not allow would break the signature.
  const allowed = (fields.unsigned_field_names || '').split(',');
  const extra = {};
  if (allowed.includes('bill_to_address_line1')) {
    extra.bill_to_address_line1 = BILL_ADDRESS;
    extra.bill_to_address_city = BILL_CITY;
    extra.bill_to_address_country = BILL_COUNTRY;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ...fields,
      ...extra,
      card_type: CARD_TYPE,
      card_number: CARD,
      card_expiry_date: CARD_EXPIRY,
      card_cvn: CARD_CVN,
    }).toString(),
    redirect: 'manual',
  });
  const text = await res.text();
  const resp = {};
  for (const tag of text.match(/<input[^>]*>/g) || []) {
    const n = tag.match(/name="([^"]+)"/)?.[1];
    const v = tag.match(/value="([^"]*)"/)?.[1];
    if (n) resp[n] = v ?? '';
  }
  return {
    http: res.status,
    redirectedTo: res.status >= 300 && res.status < 400 ? res.headers.get('location') : null,
    resp,
    sentAddress: Object.keys(extra).length > 0,
  };
}

console.log(`supabase: ${SB_URL}`);
console.log(`card:     ${CARD.slice(0, 6)}…${CARD.slice(-4)}  type=${CARD_TYPE}  exp=${CARD_EXPIRY}`);
console.log(`user:     ${USER_ID}\n`);

let pass = 0, fail = 0, unverified = 0, blockedBy3ds = 0;
for (const c of CASES) {
  const hkd = (c.amountMinor / 100).toFixed(2);
  console.log(`Case ${c.case} · HK$${hkd} (amount_minor ${c.amountMinor})`);
  try {
    const orderId = await seedOrder(c.amountMinor);
    const { endpoint, fields } = await signOrder(orderId);

    // Never let a connectivity test fire at the live gateway with a real card.
    if (!/testsecureacceptance/.test(endpoint)) {
      console.log(`   ⛔ ABORT — signer returned a NON-TEST endpoint: ${endpoint}\n`);
      fail++;
      continue;
    }
    // The amount is re-derived server-side from the order; this is the proof the
    // cents survived the round trip into the signature.
    if (fields.amount !== hkd) {
      console.log(`   ⚠️  signer signed amount "${fields.amount}", expected "${hkd}"`);
    }

    const { http, redirectedTo, resp, sentAddress } = await submit(endpoint, fields);
    const reason = Number(resp.reason_code);

    // A 302 into payer_authentication is NOT an amount failure — the gateway
    // accepted the request and handed off to 3-D Secure, which needs a real
    // browser (device fingerprint + challenge). The GPAP test cards are
    // amount-driven and not 3DS-enrolled, so payer auth has to be OFF on the
    // profile for this test — and the profile PROMOTED afterwards, or the change
    // lands on the inactive copy and nothing appears to happen.
    const wentTo3ds = /payer_authentication/.test(redirectedTo || '');

    let verdict;
    if (wentTo3ds) { blockedBy3ds++; verdict = '⏸️  3DS — payer auth is ON, amount never evaluated'; }
    else if (c.expected === null) { unverified++; verdict = 'ℹ️  no expectation set'; }
    else if (reason === c.expected) { pass++; verdict = '✅ PASS'; }
    else { fail++; verdict = '❌ FAIL'; }

    console.log(`   order=${orderId}`);
    console.log(`   signed amount=${fields.amount} mid=…204 ref=${fields.reference_number}`);
    console.log(`   billing address supplied by "browser": ${sentAddress ? 'yes' : 'no (signer signed it)'}`);
    console.log(`   → reason ${Number.isFinite(reason) ? reason : '—'} expected ${String(c.expected ?? '—')} ${verdict}`);
    console.log(`   decision=${resp.decision ?? '?'} http=${http} gateway echoed amount=${resp.req_amount ?? '(none)'}`);
    if (redirectedTo) console.log(`   redirected to ${redirectedTo}`);
    if (resp.missing_fields) console.log(`   ⚠️  missing_fields: ${resp.missing_fields}`);
    if (resp.invalid_fields) console.log(`   ⚠️  invalid_fields: ${resp.invalid_fields}`);
    if (resp.message) console.log(`   gateway: ${resp.message}`);
  } catch (e) {
    fail++;
    console.log(`   ❌ ${e.message}`);
  }
  console.log('');
}
console.log(`──────── ${pass} passed, ${fail} failed, ${unverified} unverified of ${CASES.length} ────────`);
if (blockedBy3ds > 0) {
  console.log(`\n${blockedBy3ds} case(s) stopped at 3-D Secure. The signing, the merchant routing and`);
  console.log('the odd-cent amounts are all proven by that point — the amount is simply never');
  console.log('reached. To finish headless: in the Business Center, turn Payer Authentication');
  console.log(`OFF on the …204 profile and PROMOTE it. To finish in a browser instead, pay the`);
  console.log('seeded orders above through /checkout, which is what the GPAP deck needs anyway.');
}
