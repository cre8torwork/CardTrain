// Probe: what does Secure Acceptance HOSTED CHECKOUT actually give us on …204?
//
// GPAP requires UnionPay to be submitted as Hosted Checkout, not Checkout API /
// Silent Order POST. EBC records the method per transaction as the "Client
// Application"; ours reads "Secure Acceptance SOP" because sign-checkout hands both
// networks the same CYBS_SA_ENDPOINT (/silent/pay).
//
// sa-integration-matrix.mjs already established that …204 accepts POST /pay and
// answers 302 → /checkout (its hosted payment page). This script answers the
// follow-on question that decides the UX:
//
//   Can that hosted page live inside our payment iframe?
//
// Our checkout posts into a same-page iframe and tells the customer "you are never
// redirected off Card Train". If CyberSource sends X-Frame-Options or a CSP
// frame-ancestors on the hosted page, that promise cannot hold for UnionPay and the
// copy has to change — copy GPAP reviews.
//
//   SB_SERVICE=<service_role key> node scripts/sa-cup-hosted-probe.mjs

const SB_URL = process.env.SB_URL || 'https://cdsrzczbnbhlmiebxzfb.supabase.co';
const SB_SERVICE = process.env.SB_SERVICE;
const SB_ANON = process.env.SB_ANON;
const ORDER_ID = process.env.SA_CUP_ORDER_ID || 'd0954263-4ea6-4c1d-bdb4-22ade2d06964';
const BASE = 'https://testsecureacceptance.cybersource.com';

if (!SB_SERVICE) { console.error('Missing SB_SERVICE'); process.exit(1); }

const r = await fetch(`${SB_URL}/functions/v1/sign-checkout`, {
  method: 'POST',
  headers: {
    apikey: SB_ANON || SB_SERVICE,
    Authorization: `Bearer ${SB_ANON || SB_SERVICE}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ orderId: ORDER_ID, network: 'unionpay' }),
});
const signed = await r.json();
if (!signed.fields) { console.error('sign failed:', JSON.stringify(signed).slice(0, 200)); process.exit(1); }

// Every name in unsigned_field_names must be PRESENT or CyberSource 403s on every
// endpoint — a 403 that reads exactly like "wrong integration method".
const supplied = {};
for (const n of (signed.fields.unsigned_field_names || '').split(',').filter(Boolean)) {
  supplied[n] = {
    card_type: '062',
    card_number: '6210032578574424',
    card_expiry_date: '11-2030',
    card_cvn: '123',
    bill_to_address_line1: '1 Connaught Road Central',
    bill_to_address_city: 'Central',
    bill_to_address_country: 'HK',
  }[n] ?? '';
}

console.log(`sign-checkout currently returns: ${signed.endpoint}`);
console.log(`amount=${signed.fields.amount} profile=${signed.fields.profile_id}\n`);

const res = await fetch(`${BASE}/pay`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ ...signed.fields, ...supplied }).toString(),
  redirect: 'manual',
});
console.log(`POST /pay → HTTP ${res.status}`);
const loc = res.headers.get('location');
if (!loc) { console.log('no redirect — nothing more to inspect'); process.exit(0); }
console.log(`Location: ${loc}`);

// Carry the session cookies the handoff set, or the hosted page bounces us.
const cookies = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
const url = loc.startsWith('http') ? loc : new URL(loc, BASE).toString();
const page = await fetch(url, { redirect: 'manual', headers: cookies ? { cookie: cookies } : {} });

console.log(`\nhosted page: HTTP ${page.status}  ${url}`);
const xfo = page.headers.get('x-frame-options');
const csp = page.headers.get('content-security-policy');
console.log(`  x-frame-options:         ${xfo || '(none)'}`);
console.log(`  content-security-policy: ${csp || '(none)'}`);
const framable = !xfo && !/frame-ancestors/i.test(csp || '');
console.log(`  FRAMABLE: ${framable ? '✅ yes — the in-site iframe UX can survive' : '❌ NO — UnionPay must become a full-page redirect'}`);

const html = await page.text();
console.log(`  ${html.length} bytes; card form: ${/card.?number|expiry|cvn|cvv/i.test(html) ? 'yes' : 'no'}`);
const title = html.match(/<title[^>]*>([^<]*)</i)?.[1]?.trim();
if (title) console.log(`  title: ${title}`);
