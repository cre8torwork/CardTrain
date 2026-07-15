# Card Train — CyberSource Payment Integration · Design Spec

- **Date:** 2026-07-15
- **Client:** Card Train (merchant *CTVEST DECISION PARTNER*), Hong Kong
- **Owner:** CRE8TOR
- **Gateway:** CyberSource · **Processor/acquirer:** Global Payments Asia Pacific (GPAP)
- **Reference skill:** `payment-gateways` · **Vault:** `vault/Clients/Card Train/`

---

## 1. Context & problem

Card Train is a **points + gacha ("draw") + shop** platform, exported from
Readdy.ai as a Vite/React/TypeScript app on Supabase (Postgres + Deno edge
functions). Users buy **CTP points** (1 HKD = 10 CTP), then spend points on draws
and on shop goods. We are integrating card payments (and, later, Apple Pay and
Google Pay) via CyberSource, against a merchant account **already provisioned** by
GPAP for legacy CyberSource APIs — **not** REST/Unified Checkout.

GPAP — the processor, not CyberSource — owns the go-live gate:
**Profile Integration (us) → Connectivity Testing (GPAP eCommerce) → Website
Review (GPAP Credit & Risk) → Go-Live**. Contact `apecommerce@globalpay.com`.

### Provisioning (fixed — the account dictates the integration)

| Merchant ID | Integration | Features |
|---|---|---|
| `gphk088034609200` | Secure Acceptance **Checkout API** (Silent Order POST) | 3D Secure, ECI blocking (0167) |
| `gphk088034609201` | **Simple Order API** | Google Pay |
| `gphk088034609202` | **Simple Order API** | Apple Pay |

Merchant *CTVEST DECISION PARTNER* · HKD · Visa + Mastercard (see open Q3). All
three MIDs: Void, Refund, Authorization Reversal, Ignore AVS.

### Key insight that shapes the whole build

**The GPAP Connectivity Test Plan is cards-only** — 3 test cases on the Secure
Acceptance card rail, no Apple Pay / Google Pay cases. And **Buy Points is a Sale
with no follow-on operation**. So the critical path to go-live is small and
runs on the existing Supabase/Deno stack. The architecture constraints we logged
(no Node/JS SDK for Simple Order API; XML-DSig infeasible on Deno; Apple Pay's
`/.well-known/` file) bite **only the wallet rails and the server-to-server
follow-on operations**, not the go-live gate.

## 2. Scope

### In scope
- **Buy Points** card payment — Secure Acceptance, `transaction_type = sale`
  (instant digital fulfilment; points credited server-side, exactly once).
- **Shop goods** card payment — Secure Acceptance, `transaction_type =
  authorization`; **capture on shipment**; void / auth-reversal / refund.
- **Confirmation page** for every outcome with the GPAP reason-code → message
  mapping and a unique, displayed `reference_number`.
- **GPAP connectivity test deliverable** (screenshots → PowerPoint) and the
  Website Review requirements.
- **Apple Pay + Google Pay** (Track B, fast-follow — not gated by connectivity
  testing).

### Out of scope
- Subscriptions, saved cards / tokenised reuse, AVS logic (all MIDs Ignore AVS).
- Changing the draws/shop points mechanics (only *adding* a card path to shop).
- REST / Unified Checkout (not provisioned; revisit only if GPAP confirms it —
  open Q4).

### Non-goals / explicit deletions
- Remove the Readdy Stripe scaffolding (`@stripe/react-stripe-js`) and Firebase
  from the payment path — neither is used by this integration.

## 3. Decisions (locked with the owner, 2026-07-15)

| # | Decision | Choice |
|---|---|---|
| D1 | Sequencing | **Cards first** (Secure Acceptance on Supabase/Deno) → pass GPAP → go live. Wallets fast-follow. |
| D2 | Buy Points model | **Sale** (auth + capture in one; instant point credit). |
| D3 | Shop goods model | **Authorize now, capture on shipment** (adds void / reversal / refund). |
| D4 | Networks | **All five** in the test plan: Visa, Mastercard, JCB, Amex, UnionPay (subject to Q3). |
| D5 | Backend | **Hybrid** — Deno for initial charges; one **PHP** service (official Simple Order SDK) for follow-ons and, later, wallets. |

## 4. Architecture

```
Front end  (this Vite/React repo, deployed to Vercel/Netlify/Railway)
  - Buy Points page + Shop card checkout
  - Loads CyberSource Secure Acceptance form; card fields POST direct to CyberSource
  - Serves /.well-known/apple-developer-merchantid-domain-association (Track B)
  - Stripe + Firebase scaffolding removed

Supabase edge (Deno)                         [M1 — go-live critical]
  - sign-checkout:  server-side HMAC-SHA256 signing of Secure Acceptance fields
  - checkout-response: verify response signature, update order, credit points
  - Secrets: SA Profile ID, Access Key, Secret Key (env only)

PHP service (Railway/Fly, official Simple Order SDK)   [M2 + M3]
  - Follow-ons: capture / void / refund / auth-reversal   (M2)
  - Apple Pay (paymentSolution 001, MID …202)             (M3)
  - Google Pay (paymentSolution 012, MID …201)            (M3)
  - Secrets: both P12 certs (env only)

Postgres (Supabase): orders, payment_events
```

### Milestones
- **M0 — Unblock.** EBC2 admin activation + credentials (Profile/Access/Secret
  keys); deploy front end off Readdy; remove Stripe/Firebase; send GPAP the
  open-questions batch; chase the 7 missing attachments.
- **M1 — Cards initial + confirmation (Deno).** Buy Points Sale live-capable;
  Shop authorization. Pass the GPAP connectivity test → Website Review →
  **go live on Buy Points**.
- **M2 — PHP follow-on service.** Capture-on-ship (shop goods functional end to
  end), void, refund, auth-reversal. Enables shop-goods go-live + refunds.
- **M3 — Wallets (Track B).** Apple Pay + Google Pay on the PHP service.

## 5. Data model & order state machine

- `orders`: `id, kind (buy_points | shop_goods), amount_minor (HKD cents,
  integer), currency, status, mid, reference_number, cybersource_request_id,
  created_at`.
- `payment_events`: **append-only** log of every money mutation — `type, amount,
  actor, reason, cybersource_ids, created_at`. Source for reconciliation across
  all three MIDs.
- **States:** `created → pending → paid | authorized | declined | error`, then
  `captured | voided | reversed | refunded | partially_refunded`.

### Invariants (money-code rules)
1. **`reference_number` is new and unique on EVERY request, including retries**
   (GPAP requirement) and is displayed on the confirmation page.
2. Because of (1), **double-charge protection lives in the state machine, not the
   reference**: one order → at most one successful authorization, guarded on
   `cybersource_request_id`. These are separate concepts — conflating them either
   double-charges or fails certification.
3. **Amounts are integer minor units (HKD cents) end to end**; convert to decimal
   only at the display edge. No floats near money.
4. **CTP points are credited server-side, exactly once, only on a verified
   `paid` response** — never on a browser claim; idempotent on
   `cybersource_request_id`.
5. **Settlement, not the API response, is the source of truth** for final order
   state; reconciliation reads settlement (EBC / follow-on status).
6. **Refunds route back through the same MID** that took the payment.

## 6. Cards — Secure Acceptance Silent Order POST (M1, Deno)

- Edge fn **`sign-checkout`**: takes an order id, **re-derives the amount
  server-side**, generates the unique `reference_number`, sets `transaction_type`
  (`sale` for points, `authorization` for shop), and returns the field set signed
  with **HMAC-SHA256 over the comma-separated `signed_field_names`** using the
  Secret Key. Everything except `card_number`, `card_cvn`, `card_expiry_*` is
  signed. **Byte-match the signed string to the integration guide** — field order
  and separators matter; a mismatch fails opaquely.
- The **browser form-POSTs card fields directly to CyberSource**
  (test `https://testsecureacceptance.cybersource.com/silent/pay`,
  live `https://secureacceptance.cybersource.com/silent/pay`). **Card data never
  touches our servers.**
- Edge fn **`checkout-response`**: CyberSource POSTs signed response fields to our
  receipt URL → **verify the response signature** → read `decision` +
  `reason_code` → update the order → (Buy Points) credit CTP → render
  confirmation.
- **3D Secure** is provisioned on `…200`; enable Secure Acceptance payer auth.
  ECI blocking (0167) behaviour is an **open question** (Q5) — do not infer.
- **PCI scope: SAQ A-EP** (card fields render on our page). Confirm with Card
  Train before they sign.

## 7. Confirmation page & reason-code messaging (GPAP acceptance criteria)

A confirmation page for **every** outcome, showing status, the `reference_number`,
and exactly this mapping:

| `reason_code` | Message |
|---|---|
| `100` | **Transaction successful.** (Reference Number: `<ref>`) |
| `201, 203, 204, 205, 208, 210, 211` | **Transaction rejected, please contact your bank…** (Reference Number: `<ref>`) |
| `150` and all other declines | **Transaction unsuccessful, please try again…** (Reference Number: `<ref>`) |

- **Never** display sensitive wording (e.g. "Insufficient Fund") — GPAP rejects it.
- **3DS logos** (Visa Secure, Mastercard Identity Check) sit **near the CHECKOUT
  button** (Website Review requirement).

> Note: the plan's bottom paragraph swaps the "Test case 2/3" labels relative to
> its own tables. The **message ↔ reason-code mapping above is internally
> consistent across both places** and is what we build; we will still confirm it
> with GPAP (Q2).

## 8. Follow-on operations — PHP service (M2)

- Official CyberSource **Simple Order API PHP SDK**, **P12 cert + WS-Security**.
  Internal, **admin-gated, human-in-the-loop** endpoints: `capture` (on ship),
  `void` (pre-settlement), `refund` (post-settlement), `authReversal` (release a
  hold pre-capture).
- **Refunds route back through the same MID.** **Partial refunds accumulate**
  against the captured amount — never exceed it. Every call writes a
  `payment_events` row.
- If GPAP confirms REST is enabled (Q4), this service *may* instead run on Deno
  via hand-rolled JWT + MLE — but the default and recommendation is the PHP
  service, since it is also required for wallets.

## 9. Wallets — Track B (M3, same PHP service)

- **Apple Pay** (MID `…202`, `paymentSolution = 001`): CyberSource generates the
  CSR for the Payment Processing Cert (don't self-generate); register the domain
  with Apple; serve `/.well-known/apple-developer-merchantid-domain-association`;
  **testing needs a real wallet + real card** (no Apple Pay test card).
- **Google Pay** (MID `…201`, `paymentSolution = 012`): gateway `cybersource`,
  `gatewayMerchantId = gphk088034609201`; **sandbox is Visa-only**
  (`4111 1111 1111 1111`).

## 10. GPAP connectivity test deliverable (the go-live gate)

Test cards (replace `X` → `0`): Visa `4000 00XX XXXX 2503`, MC
`5200 00XX XXXX 2151`, JCB `3338 00XX XXXX 0569`, Amex `3400 00XX XXX2 534`
(CVV 1234), UnionPay `621X X325 7857 4424`. Any future expiry; CVV 123 (Amex 1234).

**Matrix — 3 cases × 5 networks, minus Amex in Case 3 = 14 transactions.**
Submit the exact trigger amounts (confirm HKD units, Q6):

| Case | Message | Amount → network |
|---|---|---|
| 1 · success (rc 100) | Transaction successful. | **10** on Visa/MC/JCB/Amex/UnionPay |
| 2 · system (rc 150) | Transaction unsuccessful, please try again… | **4091** Visa/MC/JCB · **2009** Amex · **9000.91** UnionPay |
| 3 · issuer (rc 204) | Transaction rejected, please contact your bank… | **4051** Visa/MC/JCB · **9000.51** UnionPay |

For each: **step-by-step screenshots** from the final checkout page → confirmation
page (status + correct message + `reference_number`). Assemble into a
**PowerPoint** in GPAP's sample format; email `apecommerce@globalpay.com`;
iterate on comments. Verify each result in EBC test (URL per Q7). Then Website
Review, then production health test (real card, min amount, funds landing in the
merchant bank account — not just an approved auth), on each rail.

## 11. Open questions for GPAP (ask, never infer) — send before building the harness

1. Plan says "**6** testing cases" but lists **3** — confirm the count.
2. Confirm the reason-code → message mapping and the swapped case labels.
3. Which **networks are actually enabled** on MID `…200`? (Provisioning said
   Visa + MC; the plan tests 5.) Determines the real test matrix.
4. Which API carries **void / refund / authorization reversal** — REST or Simple
   Order? Is **REST / Unified Checkout** enabled at all? *(Confirms M2's stack.)*
5. What is **"ECI blocking (0167)"**? It decides which real transactions decline.
6. Are the **test amounts in HKD dollars** (e.g. HK$4,091.00)?
7. Which **EBC URL** — the plan's `ebctest.cybersource.com/ebctest` or our
   earlier note's `ebc2test.cybersource.com/ebc2`?

Plus standing blockers: **EBC2 admin activation link + credentials** (Profile ID,
Access Key, Secret Key); **chase the 7 missing attachments** (Website
Requirement/T&Cs, Apple Pay 3.0 guide, Google Pay Quick Start, sample screenshots
PPT, EBC key-download guide, FAQ, 3DS logo assets).

## 12. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Follow-on API forces PHP into the go-live path | Medium | Buy Points (Sale) needs no follow-on → goes live on Deno regardless; confirm Q4 early |
| Networks not all enabled on `…200` | Medium | Q3 before sizing the harness; default Visa+MC |
| Double-charge on retry | **High** | Unique `reference_number` per request + one-auth-per-order in the state machine; explicit test |
| Points credited more than once | **High** | Credit server-side, idempotent on `cybersource_request_id` |
| Signed-string byte mismatch → opaque 401/deny | **High** | Byte-match to guide; unit-test the signer against sandbox in isolation |
| Secrets leaking to the front end | **High** | SA keys in Deno env, P12 in PHP env; never in browser/Git/Readdy/vault |
| `targetOrigins` / receipt URL breaks on domain change | Medium | Re-point at go-live; re-verify Apple Pay against live hostname |
| PCI scope surprise (SAQ A-EP) | Medium | Confirm with client before signing |

## 13. Success criteria

- All 14 connectivity-test transactions produce the correct decision **and** the
  exact GPAP message + `reference_number` on the confirmation page; verified in
  EBC; accepted by GPAP eCommerce.
- Website Review passed; production credentials released.
- Go-live health test: real card, min amount, **funds confirmed landing** in the
  merchant bank account, on each live rail.
- No double-charge and no double-credit under retry/duplicate-submit tests.
- Buy Points live (M1); Shop card checkout with capture-on-ship + refunds (M2);
  Apple Pay + Google Pay (M3).
