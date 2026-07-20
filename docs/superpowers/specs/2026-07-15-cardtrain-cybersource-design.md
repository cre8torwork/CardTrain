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
- Unified Checkout (GPAP-confirmed: not available on any MID). REST exists but is
  not used for the initial charge (that's Secure Acceptance).

### Non-goals / explicit deletions
- Remove the Readdy Stripe scaffolding (`@stripe/react-stripe-js`) and Firebase
  from the payment path — neither is used by this integration.

## 3. Decisions (locked with the owner, 2026-07-15)

| # | Decision | Choice |
|---|---|---|
| D1 | Sequencing | **Cards first** (Secure Acceptance on Supabase/Deno) → pass GPAP → go live. Wallets fast-follow. |
| D2 | Buy Points model | **Sale** (auth + capture in one; instant point credit). |
| D3 | Shop goods model | **Authorize now, capture on shipment** (adds void / reversal / refund). |
| D4 | Networks | **Visa + Mastercard only** (GPAP-confirmed 2026-07-20 — the MID carries only these; the test plan lists more because it is a universal template). **3 cases × 2 cards = 6 transactions** on the cards MID. |
| D5 | Backend | **Hybrid** — Deno for initial charges; one **PHP** service (official Simple Order SDK) for follow-ons and, later, wallets. (REST *also* carries the follow-ons — see §8 — but PHP is needed for wallets regardless, so it stays the one money backend.) |

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
- **3D Secure is effectively mandatory.** MID `…200` has **ECI blocking (0167)**,
  which GPAP confirmed (2026-07-20) blocks any transaction whose **ECI value is 0,
  1, 6 or 7** — i.e. everything except a *fully authenticated* 3DS result (Visa ECI
  `05`, Mastercard ECI `02`). "Attempted" and "not authenticated" outcomes are
  declined by GPAP. So we **must** run Secure Acceptance payer auth (3DS) and expect
  non-fully-authenticated attempts to come back as declines (mapped via §7). Design
  the flow so a legitimate cardholder reaches full authentication.
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

> **GPAP-approved (2026-07-20):** GPAP confirmed this mapping is acceptable and
> that the test-plan wording is only a suggestion — so the messages above are what
> we ship. (The plan's swapped "Test case 2/3" labels were a template artifact.)

## 8. Follow-on operations — PHP service (M2)

- Official CyberSource **Simple Order API PHP SDK**, **P12 cert + WS-Security**.
  Internal, **admin-gated, human-in-the-loop** endpoints: `capture` (on ship),
  `void` (pre-settlement), `refund` (post-settlement), `authReversal` (release a
  hold pre-capture).
- **Refunds route back through the same MID.** **Partial refunds accumulate**
  against the captured amount — never exceed it. Every call writes a
  `payment_events` row.
- GPAP confirmed (2026-07-20) that **both Simple Order and REST carry void / refund
  / authorization reversal**, and that **no MID has Unified Checkout**. REST would
  let follow-ons run on Deno (hand-rolled JWT + MLE), but the PHP service stays the
  plan — it is required for wallets anyway, so keeping all server-to-server money
  calls on one official-SDK backend is cleaner than hand-rolling MLE on money code.

## 9. Wallets — Track B (M3, same PHP service)

- **Apple Pay** (MID `…202`, `paymentSolution = 001`): CyberSource generates the
  CSR for the Payment Processing Cert (don't self-generate); register the domain
  with Apple; serve `/.well-known/apple-developer-merchantid-domain-association`;
  **testing needs a real wallet + real card** (no Apple Pay test card).
- **Google Pay** (MID `…201`, `paymentSolution = 012`): gateway `cybersource`,
  `gatewayMerchantId = gphk088034609201`; **sandbox is Visa-only**
  (`4111 1111 1111 1111`).

## 10. GPAP connectivity test deliverable (the go-live gate)

Currency: **HKD** (GPAP-confirmed). Test cards (replace `X` → `0`), for the two
networks the MID carries: Visa `4000 00XX XXXX 2503`, Mastercard
`5200 00XX XXXX 2151`. Any future expiry; CVV `123`.

**Matrix — 3 cases × 2 networks = 6 transactions** (GPAP-confirmed 2026-07-20:
3 transactions per enabled card type). Submit the exact trigger amounts:

| Case | Message | Amount (HKD) — both Visa & Mastercard |
|---|---|---|
| 1 · success (rc 100) | Transaction successful. | **10** |
| 2 · system (rc 150) | Transaction unsuccessful, please try again… | **4091** |
| 3 · issuer (rc 204) | Transaction rejected, please contact your bank… | **4051** |

(JCB / Amex / UnionPay in the plan are ignored — the plan is a universal template;
this MID carries only Visa + Mastercard.)

For each: **step-by-step screenshots** from the final checkout page → confirmation
page (status + correct message + `reference_number`). Assemble into a
**PowerPoint** in GPAP's sample format; email `apecommerce@globalpay.com`;
iterate on comments. Verify each result in EBC test (URL per Q7). Then Website
Review, then production health test (real card, min amount, funds landing in the
merchant bank account — not just an approved auth), on each rail.

## 11. GPAP answers (resolved 2026-07-20)

1. **Test cases:** 3 transactions per enabled card type → 2 cards × 3 = **6
   transactions** on the cards MID.
2. **Message mapping:** our §7 mapping is **approved**; the test-plan wording is a
   suggestion only.
3. **Networks:** the MID carries **Visa + Mastercard only** — the plan lists more
   because it is a universal template.
4. **Follow-on API:** **both Simple Order and REST** carry void / refund /
   authorization reversal; **no MID has Unified Checkout**.
5. **ECI blocking (0167):** blocks transactions with **ECI value 0, 1, 6 or 7** —
   i.e. everything except a fully authenticated 3DS result (Visa `05` / MC `02`).
   Full 3DS authentication is effectively required (see §6).
6. **Currency:** test in **HKD**.
7. **EBC URL:** *(still to confirm)* — the test plan cites
   `https://ebctest.cybersource.com/ebctest/login/` for verifying results.

**Still pending (blockers):** **EBC2 admin activation link + credentials** (Profile
ID, Access Key, Secret Key); the **outstanding attachments** (Website
Requirement/T&Cs, Apple Pay 3.0 guide, Google Pay Quick Start, sample screenshots
PPT, EBC key-download guide, FAQ, 3DS logo assets).

## 12. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Non-fully-authenticated 3DS blocked by ECI 0167 → legit cardholders declined | **High** | 3DS payer auth wired so cardholders reach full authentication (Visa 05 / MC 02); test the challenge flow |
| ~~Follow-on API forces PHP into go-live~~ | Resolved | Both REST & Simple Order carry follow-ons; Buy Points needs none anyway |
| ~~Networks not all enabled on `…200`~~ | Resolved | GPAP confirmed Visa + MC only → 6-transaction matrix |
| Double-charge on retry | **High** | Unique `reference_number` per request + one-auth-per-order in the state machine; explicit test |
| Points credited more than once | **High** | Credit server-side, idempotent on `cybersource_request_id` |
| Signed-string byte mismatch → opaque 401/deny | **High** | Byte-match to guide; unit-test the signer against sandbox in isolation |
| Secrets leaking to the front end | **High** | SA keys in Deno env, P12 in PHP env; never in browser/Git/Readdy/vault |
| `targetOrigins` / receipt URL breaks on domain change | Medium | Re-point at go-live; re-verify Apple Pay against live hostname |
| PCI scope surprise (SAQ A-EP) | Medium | Confirm with client before signing |

## 13. Success criteria

- All 6 connectivity-test transactions produce the correct decision **and** the
  exact GPAP message + `reference_number` on the confirmation page; verified in
  EBC; accepted by GPAP eCommerce.
- Website Review passed; production credentials released.
- Go-live health test: real card, min amount, **funds confirmed landing** in the
  merchant bank account, on each live rail.
- No double-charge and no double-credit under retry/duplicate-submit tests.
- Buy Points live (M1); Shop card checkout with capture-on-ship + refunds (M2);
  Apple Pay + Google Pay (M3).
