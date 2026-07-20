# GPAP Connectivity Test — Runbook

The deliverable that gets us to go-live: run GPAP's test cases on the cards MID
(`gphk088034609200`), screenshot every step, assemble a PowerPoint, and email it to
`APEcommerce@globalpay.com`. GPAP reviews **wording, layout and logos**, not just
the API calls — this is an approval gate run by people, not an internal QA pass.

Background: the design spec (`2026-07-15-cardtrain-cybersource-design.md`).

## Prerequisites (all must be true before starting)

- [ ] Secure Acceptance **Profile ID / Access Key / Secret Key** installed in the
      Supabase env (`CYBS_SA_*`), `CYBS_SA_ENDPOINT` = the **test** URL
      (`https://testsecureacceptance.cybersource.com/silent/pay`).
- [ ] The **profile is configured**: currency **HKD**; card types **Visa +
      Mastercard**; **Check Payer Authentication** (3DS 2.0) enabled; Ignore AVS.
- [ ] The checkout + confirmation page are deployed to a test host, with the 3DS
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
