// Which Secure Acceptance INTEGRATION METHOD is each merchant's profile actually
// configured for?
//
// GPAP requires UnionPay to be submitted as Secure Acceptance **Hosted Checkout**;
// EBC records the method per transaction as the "Client Application", and ours
// currently reads "Secure Acceptance SOP" for UnionPay.
//
// A Secure Acceptance profile is BOUND to one integration method when it is created.
// Post to the wrong endpoint for that method and CyberSource answers 403 before it
// ever looks at the signature. So probing each profile against each endpoint tells
// us how the profile is really configured — which decides whether this is a code
// change, a Business Center change, or both.
//
//   /silent/pay  = Checkout API (Silent Order POST)  → EBC "Secure Acceptance SOP"
//   /pay         = Hosted Checkout                    → EBC "Secure Acceptance Hosted Checkout"
//
//   SB_SERVICE=<service_role key> node scripts/sa-integration-matrix.mjs

const SB_URL = process.env.SB_URL || 'https://cdsrzczbnbhlmiebxzfb.supabase.co';
const SB_SERVICE = process.env.SB_SERVICE;
const SB_ANON = process.env.SB_ANON;
const ORDER_ID = process.env.SA_CUP_ORDER_ID || 'd0954263-4ea6-4c1d-bdb4-22ade2d06964';

if (!SB_SERVICE) { console.error('Missing SB_SERVICE'); process.exit(1); }

const BASE = 'https://testsecureacceptance.cybersource.com';
const ENDPOINTS = [
  { name: 'Checkout API (SOP)', path: '/silent/pay' },
  { name: 'Hosted Checkout',    path: '/pay' },
];
const NETWORKS = ['visa', 'unionpay'];

// Keep this MINIMAL. Adding Origin/Referer/User-Agent makes CyberSource answer 403
// on every endpoint for every profile — which reads exactly like "wrong integration
// method" and will send you chasing the wrong thing. A bare form post is what the
// working scripts send.
const BROWSERISH = {
  'Content-Type': 'application/x-www-form-urlencoded',
};

async function sign(network) {
  const r = await fetch(`${SB_URL}/functions/v1/sign-checkout`, {
    method: 'POST',
    headers: {
      apikey: SB_ANON || SB_SERVICE,
      Authorization: `Bearer ${SB_ANON || SB_SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId: ORDER_ID, network }),
  });
  const j = await r.json();
  if (!j.fields) throw new Error(`sign ${network} failed (${r.status}): ${JSON.stringify(j).slice(0,200)}`);
  return j.fields;
}

console.log('Probing each merchant profile against each Secure Acceptance endpoint.');
console.log('403 = the profile is NOT configured for that integration method.\n');

for (const network of NETWORKS) {
  let fields;
  try { fields = await sign(network); }
  catch (e) { console.log(`${network}: ${e.message}\n`); continue; }

  console.log(`${network}  profile=${fields.profile_id}`);
  // Re-sign per endpoint: reusing one signed set across both posts trips
  // reason_code 104 (duplicate access_key + transaction_uuid inside 15 minutes),
  // which masks whatever the endpoint would really have said.
  // EVERY field named in unsigned_field_names must be present. Omit them and
  // CyberSource returns 403 on all endpoints — indistinguishable from "wrong
  // integration method", which is a trap worth stating out loud.
  const supplied = {};
  for (const n of (fields.unsigned_field_names || '').split(',').filter(Boolean)) {
    supplied[n] = {
      card_type: network === 'unionpay' ? '062' : '001',
      card_number: network === 'unionpay' ? '6210032578574424' : '4000000000002503',
      card_expiry_date: '11-2030',
      card_cvn: '123',
      bill_to_address_line1: '1 Connaught Road Central',
      bill_to_address_city: 'Central',
      bill_to_address_country: 'HK',
    }[n] ?? '';
  }
  for (const ep of ENDPOINTS) {
    const fresh = await sign(network);
    const res = await fetch(BASE + ep.path, {
      method: 'POST', headers: BROWSERISH,
      body: new URLSearchParams({ ...fresh, ...supplied }).toString(), redirect: 'manual',
    });
    const text = await res.text();
    const out = {};
    for (const tag of text.match(/<input[^>]*>/g) || []) {
      const n = tag.match(/name="([^"]+)"/)?.[1];
      const v = tag.match(/value="([^"]*)"/)?.[1];
      if (n) out[n] = v ?? '';
    }
    const loc = res.headers.get('location');
    // 403 = wrong method for this profile. Anything else means the profile accepted
    // the call — a reason_code is then just field validation (no card sent here).
    const verdict = res.status === 403 ? '❌ NOT this method' : '✅ accepted';
    console.log(`   ${ep.name.padEnd(20)} ${ep.path.padEnd(13)} HTTP ${res.status}  ${verdict}`);
    if (loc) console.log(`      → ${loc.slice(0, 110)}`);
    if (out.reason_code) console.log(`      reason_code=${out.reason_code} missing=${out.missing_fields || '-'} invalid=${out.invalid_fields || '-'}`);
  }
  console.log('');
}
