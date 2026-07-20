# Payments — Secure Acceptance (cards)

Framework-agnostic payment logic (Web Crypto only) shared by the `sign-checkout`
and `checkout-response` edge functions. Written to run in **both** Deno (edge
runtime) and Node (tests).

## Modules

| File | Responsibility | Verified |
|---|---|---|
| `secure-acceptance.ts` | HMAC-SHA256 request signing + response-signature verification | ✅ unit-tested |
| `reason-codes.ts` | CyberSource reason code → GPAP confirmation message | ✅ unit-tested |
| `money.ts` | HKD minor-unit conversion, CTP crediting rate | ✅ unit-tested |

## Run the tests

```bash
node --test 'supabase/functions/_shared/payments/*.test.ts'
```

(No dependencies; Node ≥ 23 runs the TypeScript directly. 16 tests.)

## Environment variables (edge functions)

Set in the Supabase project — **never** in the front end, the browser, Git, or the
vault:

- `CYBS_SA_PROFILE_ID` — Secure Acceptance Profile ID (from EBC2)
- `CYBS_SA_ACCESS_KEY` — Secure Acceptance Access Key
- `CYBS_SA_SECRET_KEY` — Secure Acceptance Secret Key
- `CYBS_SA_ENDPOINT` — `https://testsecureacceptance.cybersource.com/silent/pay`
  (test) or `https://secureacceptance.cybersource.com/silent/pay` (live)
- `SITE_URL` — public site origin for the confirmation page's "Return" link
  (optional; defaults to `https://cardtrain.com`)

## Edge functions to deploy

`create-order`, `sign-checkout`, `checkout-response` (plus the existing ones).
Point the Secure Acceptance profile's **customer response page** at the deployed
`checkout-response` URL. Apply the `orders` + `payment_events` migration first.

## ⚠️ Status

The logic above is unit-tested and deterministic. What is **not** yet verified,
because it needs the real EBC2 credentials and a running DB:

- an actual signed transaction accepted by the CyberSource sandbox;
- the `sign-checkout` / `checkout-response` handlers end to end;
- the reason-code → message mapping against GPAP's live reason codes.

Do not treat a green deploy as a passed transaction. Sandbox verification is the
first task once credentials arrive (see the design spec, §11 open questions).
