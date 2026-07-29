# Payments — Secure Acceptance (cards) + OAPM (Alipay CN/HK, WeChat Pay)

Framework-agnostic payment logic (Web Crypto only) shared by the payment edge
functions. Written to run in **both** Deno (edge runtime) and Node (tests).

## Modules

| File | Responsibility | Verified |
|---|---|---|
| `secure-acceptance.ts` | HMAC-SHA256 request signing + response-signature verification (CyberSource) | ✅ unit-tested |
| `reason-codes.ts` | CyberSource reason code → GPAP confirmation message | ✅ unit-tested |
| `money.ts` | HKD minor-unit conversion, CTP crediting rate | ✅ unit-tested |
| `order-state.ts` | Back-office action state machine (capture/void/reversal/refund) — shared by both gateways | ✅ unit-tested |
| `refunds.ts` | Partial-refund accounting — shared by both gateways | ✅ unit-tested |
| `oapm-sign.ts` | SHA256 request signing + notify/response signature verification (OAPM) | ✅ unit-tested — ⚠️ digest encoding unverified, see below |
| `oapm-fields.ts` | Pure OAPM field/service derivation (wallet→payType, Sale `service` value incl. the WeChat-WAP irregular case, buyerType/pay_scene from User-Agent) | ✅ unit-tested |
| `oapm-settle.ts` | OAPM trade_status classification (pure, tested) + idempotent order-claim/CTP-credit (DB-touching, not tested) | ⚠️ partially — see below |

## Run the tests

```bash
node --test 'supabase/functions/_shared/payments/*.test.ts'
```

(No dependencies; Node ≥ 23 runs the TypeScript directly. 55 tests.)

## Environment variables (edge functions)

Set in the Supabase project — **never** in the front end, the browser, Git, or the
vault:

**CyberSource (cards):**
- `CYBS_SA_PROFILE_ID` — Secure Acceptance Profile ID (from EBC2)
- `CYBS_SA_ACCESS_KEY` — Secure Acceptance Access Key
- `CYBS_SA_SECRET_KEY` — Secure Acceptance Secret Key
- `CYBS_SA_ENDPOINT` — `https://testsecureacceptance.cybersource.com/silent/pay`
  (test) or `https://secureacceptance.cybersource.com/silent/pay` (live)

**OAPM (Alipay CN/HK, WeChat Pay) — already set in the Supabase project as of
2026-07-28:**
- `OAPM_USER_CONFIRM_KEY` — shared account key
- `OAPM_SECRET` — the `secret_code` used in every sign/verify computation
- `OAPM_BASE_URL` — `https://oapm.eftpay.com.hk/OAPM/v1/Servlet/` (production
  only — **no sandbox exists**)

**Shared:**
- `SITE_URL` — public site origin for the confirmation page's "Return" link and
  the OAPM `return_url` (optional; defaults to `https://cardtrain.com`)

## Edge functions to deploy

Cards: `create-order`, `sign-checkout`, `checkout-response`, `payment-admin`
(plus the existing wallet ones). Point the Secure Acceptance profile's
**customer response page** at the deployed `checkout-response` URL.

OAPM: `oapm-checkout`, `oapm-notify` (public — set as OAPM's `notify_url`),
`oapm-query`, `oapm-refund` (admin-gated, mirrors `payment-admin`). Apply the
`orders`/`payment_events` migrations (including
`20260728000000_oapm_payments.sql`) first.

## ⚠️ Status — CyberSource

The logic above is unit-tested and deterministic. What is **not** yet verified,
because it needs the real EBC2 credentials and a running DB:

- an actual signed transaction accepted by the CyberSource sandbox;
- the `sign-checkout` / `checkout-response` handlers end to end;
- the reason-code → message mapping against GPAP's live reason codes.

Do not treat a green deploy as a passed transaction. Sandbox verification is the
first task once credentials arrive (see the design spec, §11 open questions).

## ⚠️ Status — OAPM

**The signature has NOT been verified against a live response.** OAPM has **no
sandbox** — every real API call is production money, so nothing below has been,
or should be, exercised outside a deliberate, owner-supervised go-live step
(design spec `2026-07-28-cardtrain-oapm-design.md`, §7 and §10).

What IS unit-tested and deterministic:
- `buildAsciiParamString` / `sha256Hex` / `signOapmFields` / `verifyOapmSignature`
  (`oapm-sign.test.ts`);
- the Sale `service` value derivation, including the WeChat-WAP irregular
  `service.wechat.web.MobileH5` case (known gap §8 #1), `buyerType` and
  `pay_scene` User-Agent classification (`oapm-fields.test.ts`);
- `trade_status` → order-outcome classification for both the Sale/Query and
  Refund vocabularies (`oapm-settle.test.ts`).

What is explicitly **NOT** verified — cannot be, without a live call:
- **The sign digest encoding.** EFT's docs say "SHA256" without specifying
  hex vs base64 or case. This build assumes lowercase hex. If wrong, every
  request/notify will fail signature verification on the first live attempt —
  only `sha256Hex` needs to change.
- Whether Query responses are themselves signed (`oapm-query` verifies `sign`
  only if present in the reply).
- The Refund `service` value — the field table and the docs' own worked example
  disagree (`service.common.Refund` vs `service.alipay.web.Refund`); this build
  defaults to the field-table value (known gap §8 #3).
- The `WECHATCN` vs `WECHATHK` wallet-type question (design spec §9 open Q1) —
  this build only wires `WECHATCN`.
- The exact `pay_apptrade` redirect behavior on a real device (QR page vs app
  deep-link) for each wallet × pay_scene combination.
- The full `trade_status` enum and its edge cases beyond what the design spec's
  §4 documents (design spec §9 open Q2 — EFT's "Appendix 2" wasn't reachable).
- An actual signed Sale/Notify/Query/Refund request-response pair accepted by
  the live OAPM endpoint — the entire `oapm-checkout` / `oapm-notify` /
  `oapm-query` / `oapm-refund` HTTP round trip, end to end.

Do not treat a green deploy, or these unit tests passing, as a passed
transaction. The go-live procedure (design spec §2) is: fill in EFT's
`OAPM Test Plan v1.0.xlsx`, run the applicable cases with real (small) money,
capture request/response JSON **and a screen recording** per case, and send
them to EFT support for manual settlement activation.
