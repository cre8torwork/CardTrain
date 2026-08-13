# GPAP Connectivity Test — Runbook

The deliverable that gets us to go-live: run GPAP's test cases on the cards MID
(`gphk088034609200`), screenshot every step, assemble a PowerPoint, and email it to
`APEcommerce@globalpay.com`. GPAP reviews **wording, layout and logos**, not just
the API calls — this is an approval gate run by people, not an internal QA pass.

Background: the design spec (`2026-07-15-cardtrain-cybersource-design.md`).

## ✅ API-level dry run — all 6 pass (2026-07-23)

Ran headless via `scripts/sa-matrix.mjs` against the test endpoint with the real
credentials, **after the profile was promoted** (the fix — disabling payer auth
only takes effect once the profile is *promoted* to active). Every case returned
its expected reason code, the response signature verified, and our mapper rendered
the correct neutral cardholder message:

| Case | Card | Amount | Reason | Decision | Reference # |
|---|---|---|---|---|---|
| 1 | Visa | 10 | **100** | ACCEPT | `CTMRWPWDHJ447` |
| 1 | Mastercard | 10 | **100** | ACCEPT | `CTMRWPWEED2799` |
| 2 | Visa | 4091 | **150** | ERROR | `CTMRWPWEYD2450` |
| 2 | Mastercard | 4091 | **150** | ERROR | `CTMRWPWGOS6235` |
| 3 | Visa | 4051 | **204** | DECLINE | `CTMRWPWH9E8328` |
| 3 | Mastercard | 4051 | **204** | DECLINE | `CTMRWPWHPD338` |

Sensitive-wording rule proven: for Case 3 the gateway's own message is *"Not
sufficient funds"*, but our confirmation page shows *"Transaction rejected, please
contact your bank…"* instead.

> This proves the gateway + our signing/mapping. It is **not** the GPAP deliverable
> — GPAP wants **screenshots of the real checkout page** for each case. Re-run this
> command any time: `CYBS_SA_* node scripts/sa-matrix.mjs` (creds via env, never
> committed).

## ✅ UnionPay (…204) — both cases PASS in the browser (2026-08-13)

Run through the **real deployed checkout page** at cardtrain.net, payer auth left ON.

| Case | Amount | Reason | Decision | Reference # | CyberSource txn |
|---|---|---|---|---|---|
| 1 | HK$9000.91 | **150** | ERROR | `CTMSQYOIZAD8EFE0` | `7865919024516299004007` |
| 2 | HK$9000.51 | **204** | DECLINE | `CTMSQYQQBJ273869` | `7865920289156296904008` |

Sensitive-wording rule proven again on …204: for case 2 the gateway's own message is
*"Insufficient available balance"*, while the confirmation page shows *"Transaction
rejected, please contact your bank…"*.

Screenshots for the deck: `~/Desktop/CardTrain-GPAP-UnionPay/`.

⚠️ **3DS is non-deterministic.** Both passing runs went *frictionless* — no challenge.
An earlier attempt on the same card DID draw an OTP challenge, so the deck may need a
challenge screenshot captured on a run that happens to produce one. See the iframe bug
below, which must be deployed before any challenge run can succeed.

### The bug this run exposed — 3DS challenge was unsubmittable

`CardPaymentFrame` pinned the payment iframe at `h-[420px]`. The ACS picks one of the
standard 3-D Secure challenge sizes (250x400, 390x400, 500x600, 600x400, full-screen),
so a challenge can be 600px tall. At 420px the UnionPay challenge rendered with its
**SUBMIT / RESEND / CANCEL buttons below the clip line** — unreachable. The customer
could never authenticate, CyberSource never posted a result, and the order sat at
`pending` with only a `sign` event and a null `cybersource_request_id`.

This is customer-facing, not just a test problem: any UnionPay buyer who draws a
challenge cannot pay. Fixed by raising the frame to `h-[640px]`.

## ⏸️ Earlier: blocked at 3-D Secure (headless)

The UnionPay plan is driven by amounts whose **cents** are the trigger. Nothing in the
Buy Points UI can produce them — custom points take whole CTP and divide by 10, so HKD
never carries more than one decimal place. So the run seeds an order at an exact
`amount_minor` and calls the deployed signer.

Test data — card `6210032578574424`, exp **11-2030**, CVV `123`:

| # | Amount | Expected reason code | Expected message on confirmation page |
|---|---|---|---|
| 1 | HK$9000.91 | **150** | Transaction unsuccessful, please try again... (Reference Number: …) |
| 2 | HK$9000.51 | **204** | Transaction rejected, please contact your bank… (Reference Number: …) |

Same trigger digits as the Visa/Mastercard plan's 4091 and 4051, moved into the cents.

```
SB_SERVICE=<service_role> SA_CUP_CARD=6210032578574424 \
  node scripts/sa-cup-order-matrix.mjs
```

| Case | Amount | Signed as | Result |
|---|---|---|---|
| 1 | HK$9000.91 | `9000.91` | 302 → `/silent/payer_authentication/hybrid` |
| 2 | HK$9000.51 | `9000.51` | 302 → `/silent/payer_authentication/hybrid` |

**Proven by this run:** the odd-cent amounts round-trip into the signature exactly
(`amount_minor` 900091 → signed `"9000.91"`); the …204 merchant routing is correct;
and the billing-address fix holds — **no reason_code 101**, which was the previous
failure.

**Blocker:** Payer Authentication is **ON** on the …204 profile, so the gateway hands
off to 3DS before the amount is ever evaluated. Same trap as …200, and the same fix:
turn Payer Authentication **OFF** on the profile, then **PROMOTE** it — an unpromoted
edit lands on the inactive copy and looks like nothing happened. (Re-enable 3DS after
the gate; it is a production concern.)

Two scripts exist, deliberately:
- `scripts/sa-cup-matrix.mjs` — signs locally from `CYBS_SA_CUP_*`. Needs the …204
  secrets in hand.
- `scripts/sa-cup-order-matrix.mjs` — seeds the order and lets the **deployed**
  `sign-checkout` sign it. Needs no secret and tests the real production path.

## Prerequisites (all must be true before starting)

- [x] Secure Acceptance **Profile ID / Access Key / Secret Key** set as Supabase
      secrets (`CYBS_SA_*`), `CYBS_SA_ENDPOINT` = the **test** URL
      (`https://testsecureacceptance.cybersource.com/silent/pay`). *(Done 2026-07-22.)*
- [x] The **profile is configured**: currency **HKD**; card types **Visa +
      Mastercard**; Ignore AVS. ⚠️ **Payer Authentication must be OFF for the
      connectivity test** — the GPAP test cards are amount-driven, not 3DS-enrolled;
      with payer auth on, all 6 return reason 102 before the amount is evaluated.
      (3DS/payer auth is a *production* concern; re-enable it after the gate.)
- [ ] **Customer Response Page** on the profile → the receipt endpoint
      `https://cdsrzczbnbhlmiebxzfb.supabase.co/functions/v1/checkout-response`
      (not the site homepage — else the browser flow hangs).
- [ ] ⚠️ **PROMOTE the profile after ANY change.** Secure Acceptance edits land on
      an *inactive* copy; live transactions use the *active* copy. Nothing takes
      effect until you click **Promote**. (This was the single blocker that made all
      6 cases fail with reason 102 despite payer auth being "disabled".)
- [ ] The checkout + confirmation page are deployed (latest `main`), with the 3DS
      logos (Visa Secure, Mastercard Identity Check) near the CHECKOUT button.
- [ ] Access to **EBC** (`https://ebctest.cybersource.com/ebctest/login/` — confirm
      with GPAP) to verify each result.

## Test data

Cards (replace `X` → `0`), any future expiry, CVV `123`:

| Network | Card number |
|---|---|
| Visa | `4000 0000 0000 2503` |
| Mastercard | `5200 0000 0000 2151` |

**6 transactions** = 3 cases × 2 cards. Amounts are the trigger (HKD):

| # | Card | Amount | Expected reason code | Expected message on confirmation page |
|---|---|---|---|---|
| 1 | Visa | 10 | 100 | Transaction successful. (Reference Number: …) |
| 2 | Mastercard | 10 | 100 | Transaction successful. (Reference Number: …) |
| 3 | Visa | 4091 | 150 | Transaction unsuccessful, please try again... (Reference Number: …) |
| 4 | Mastercard | 4091 | 150 | Transaction unsuccessful, please try again... (Reference Number: …) |
| 5 | Visa | 4051 | 204 | Transaction rejected, please contact your bank… (Reference Number: …) |
| 6 | Mastercard | 4051 | 204 | Transaction rejected, please contact your bank… (Reference Number: …) |

## Procedure — per transaction

1. Start a fresh checkout for the given amount. **Screenshot** the final checkout
   page (amount + card entry + 3DS logos visible).
2. Enter the test card; complete the 3DS challenge if prompted. **Screenshot** the
   3DS step if one appears.
3. Submit. **Screenshot** the confirmation page — it must show the transaction
   status, the exact expected message, and the **`reference_number`** our app
   assigned and displayed.
4. In **EBC**, open the transaction and **screenshot** the record showing the
   reason code matches the "Expected reason code" column.
5. Confirm the `reference_number` on the confirmation page matches EBC.

## Assemble & submit

- [ ] One section per transaction, in order, each with its step screenshots
      (checkout → [3DS] → confirmation → EBC), in GPAP's sample PowerPoint format.
- [ ] Sanity check: **no** confirmation page leaks sensitive wording (e.g.
      "Insufficient Fund"); every reference number is unique across the 6.
- [ ] Email the deck to `APEcommerce@globalpay.com`. Expect comments and a re-test
      loop — leave slack in the schedule.

## After a pass

Connectivity Testing → **Website Review** (Credit & Risk; they may contact the
client directly — warn them) → production credentials released → go-live health
test (real card, min amount, funds confirmed landing).
