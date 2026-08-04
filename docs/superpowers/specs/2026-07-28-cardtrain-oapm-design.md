# Card Train — OAPM (Alipay CN/HK, WeChat Pay) Integration · Design Spec

- **Date:** 2026-07-28
- **Client:** Card Train (merchant *CTVEST DECISION PARTNER*), Hong Kong
- **Owner:** CRE8TOR
- **Gateway:** OAPM (Other Alternative Payment Methods) — EFT Payments, a Global
  Payments e-commerce partner
- **Reference skill:** `payment-gateways` · **Vault:** `vault/Clients/Card Train/`
- **Sibling doc:** `2026-07-15-cardtrain-cybersource-design.md` (cards, Apple Pay,
  Google Pay) — this doc adds a second, independent payment rail

---

## 1. Context & problem

Card Train already has a CyberSource card-payment integration (Secure
Acceptance) live on Buy Points and Shop goods. We are adding **Alipay CN,
Alipay HK, and WeChat Pay** as a second payment rail through EFT's OAPM
gateway — QR-code / wallet-app payments, not cards.

OAPM is architecturally simpler than CyberSource Simple Order: it's a plain
JSON HTTP API with a SHA-256 string-to-sign, no XML-DSig, no P12 certs, no
official SDK. It fits directly into the existing Supabase/Deno edge-function
stack — **no new backend service is needed** (unlike the CyberSource PHP
service required for wallets/follow-ons).

**No sandbox exists.** Every integration test is a real transaction against
production, using real wallets, for real (small) money. Go-live requires
submitting a request/response JSON pair **and a screen-recording video** per
required test case to EFT support, who then manually flips on settlement to
the merchant bank account — the same "GPAP owns the go-live gate" shape as
the CyberSource integration, just with EFT support standing in for GPAP.

## 2. Scope

### In scope
- **Buy Points** and **Shop goods** checkout both gain Alipay CN, Alipay HK,
  and WeChat Pay as payment options, alongside the existing card option.
- **Both PC WEB and Mobile WAP** pay scenes for all three wallets (decision
  D1 below).
- **Sale** (`PreOrder`) and **Refund**, with **Query** and **Notify** as the
  required reconciliation mechanisms (not optional — see §6).
- Admin-gated refund endpoint (decision D2), mirroring the CyberSource
  follow-on pattern already in this repo.
- Go-live test deliverable: fill in `OAPM Test Plan v1.0.xlsx`, run the
  applicable cases, capture JSON + video, send to EFT support.

### Out of scope
- The APM ERS merchant portal (`ers.apm.eftpay.com.hk`) — Card Train staff
  can use it to inspect transactions and as a manual refund fallback, but our
  app does not integrate with it programmatically.
- WECHATHK wallet (WeChat's HK-registered wallet type exists per the API
  spec, but the client asked for "WeChat Pay" generically; assuming WECHATCN
  unless EFT/Card Train say otherwise — open question, §9).
- Subscriptions, saved/tokenised wallets.

## 3. Decisions (locked with the owner, 2026-07-28)

| # | Decision | Choice |
|---|---|---|
| D1 | Pay scenes | **Both PC WEB and Mobile WAP**, all three wallets. |
| D2 | Refund path | **Admin-gated API refund** (`service.common.Refund`), same pattern as CyberSource follow-ons. APM ERS portal stays available as a manual fallback, not integrated. |
| D3 | Checkout integration point | **Additional option on both Buy Points and Shop goods**, same order/state-machine model as the card rail. |
| D4 | Backend | **Deno edge functions only** — OAPM's plain-JSON + SHA-256 signing needs no PHP/SDK, unlike CyberSource's Simple Order API. |

## 4. API contract (confirmed against EFT's official docs, 2026-07-28 —
not just the Postman sample, which has some gaps/bugs — see §8)

- **Base URL (production only — no test environment):**
  `https://oapm.eftpay.com.hk/OAPM/v1/Servlet/`
- **Endpoints:** `JSAPIService.do` (Sale + Refund), `QRcodeTradeQuery.do`
  (Query).
- **Content-Type:** `application/json`, UTF-8, **compressed/minified JSON**
  (not pretty-printed).

### Signing (both directions — request signing and notify/response verification)

```
sign = SHA256(secret_code + asciiParamString)
asciiParamString = sorted(non-"sign" keys, ASCII dictionary order)
                     .map(k => `${k}=${value}`)
                     .join("&")
```

No delimiter between `secret_code` and the param string. UTF-8 throughout.
Verification is the same computation, compared against the received `sign`.
**This must be byte-matched against a real request/response before trusting
it in production** — same discipline as the CyberSource signed-string lesson
already documented in this repo's `_shared/payments/README.md`.

### Sale (`PreOrder`)

| Field | Req'd | Notes |
|---|---|---|
| `service` | Y | `service.alipay.web.PreOrder` / `service.alipay.wap.PreOrder` / `service.wechat.web.PreOrder` / **`service.wechat.web.MobileH5`** (this is WeChat's real WAP value — confirmed in the official docs, not a typo) |
| `user_confirm_key` | Y | shared account key (in Supabase secrets now, §7) |
| `transaction_amount` | Y | decimal string, ≤2dp |
| `out_trade_no` | Y | our merchant order number — **stable for the order's life**, used for Query/Refund lookups (unlike CyberSource's `reference_number`, which must be new on every retry — different semantics, do not conflate) |
| `payType` | Y | `Alipay` / `WeChat` |
| `buyerType` | Y | `ios` / `android` / `others` — **missing from EFT's own Postman sample**, must still be sent |
| `subject` | Y | ≤127 chars |
| `wallet` | Y | `ALIPAYCN` / `ALIPAYHK` / `WECHATCN` (`WECHATHK` also exists — open question §9) |
| `pay_scene` | Y (WAP) / optional (WEB, defaults WEB) | `WEB` / `WAP` — **set explicitly, always**; EFT's own WeChat-WAP Postman sample defaults this to `"WEB"` by mistake |
| `notify_url` / `return_url` | Y | ~~`return_url` "cannot carry parameters"~~ **correction, 2026-08-04:** a live redirect showed EFT *does* append the full signed `trade_status_sync` payload as query params on return — the docs' "cannot carry parameters" refers to the URL we configure, not what EFT sends back. Still don't rely on it as the sole state source (a browser round-trip isn't proof on its own — verify the signature same as notify) — `oapm-notify`/`oapm-query` stay authoritative, but this could feed an instant result instead of a poll. |
| `active_time` | N | link validity, seconds, default 1800 |
| `lang` | N | `cn` / `en` / `hk` — map from the app's existing i18n locale |
| `time` | Y | `yyyyMMddHHmmss` |
| `sign` | Y | per above |

Response includes `pay_apptrade` (the URL to redirect/open), `eft_trade_no`
(gateway's trade id — **the idempotency key**, analogous to
`cybersource_request_id`), `return_status` (`"00"` = *request* accepted,
**not** payment success).

### Refund (`service.common.Refund`)

Requires `out_trade_no` + `eft_trade_no` from the original Sale,
`out_refund_no` (new, ours), `return_amount`, `total_fee`, `wallet`,
`payType`, `buyerType`, `pay_scene`, `reason`, `time`, `sign`.
`trade_status` progression: `TRADE_PROCESSING → APPLY_SUCCESS →
TRADE_REFUND` (partial) `/ TRADE_CLOSED` (full) `/ TRADE_FAIL`.
**Note:** the API reference table and its own worked example disagree on the
`service` value (`service.common.Refund` in the Postman sample and table vs.
`service.alipay.web.Refund` in the docs' own example JSON) — verify which
one the live endpoint actually accepts on first test call.

### Query (`QRcodeTradeQuery.do`)

`querytype: "OUT_TRADE"` (fixed), plus `out_trade_no` **or** `eft_trade_no`
(one required), `refund_no` when querying a refund. Returns `trade_status`;
`TRADE_SUCCESS` is the only value that means paid.

### Notify (webhook, `notify_url`)

POST, `application/json`. Fields: `notify_type` (fixed `trade_status_sync`),
`out_trade_no`, `eft_trade_no`/`eftpay_trade_no`, `trade_no`/`transaction_id`,
`total_fee`, `currency`, `trade_status`, `gmt_payment`, `wallet`, `trade_type`
(fixed `SALE`), `time`, `sign`. **Verify the signature before trusting the
payload.** Respond with the literal string `success` (case-insensitive, no
signature needed) — anything else and EFT keeps retrying.

## 5. Architecture

```
Front end (existing Vite/React repo)
  - Buy Points page + Shop checkout gain wallet buttons (Alipay HK/CN, WeChat Pay)
  - Redirects to pay_apptrade (WEB: QR page in same tab; WAP: app deep-link)

Supabase edge (Deno)                                  [new]
  - oapm-checkout: re-derives amount server-side, calls Sale, returns pay_apptrade
  - oapm-notify:   public webhook — verify sign, update order, credit CTP once
  - oapm-query:    polls Query for orders stuck in `pending` past active_time
                    (covers "customer closed browser, paid later" test cases)
  - oapm-refund:   admin-gated, calls service.common.Refund
  - _shared/payments/oapm-sign.ts: sign generation + verification (Web Crypto,
    Deno + Node — same dual-runtime pattern as secure-acceptance.ts)
  - Secrets: OAPM_USER_CONFIRM_KEY, OAPM_SECRET, OAPM_BASE_URL — already set
    in Supabase project env (2026-07-28), never in the front end/Git/vault

Postgres (Supabase): orders, payment_events (extended, not forked — §6)
```

## 6. Data model — extend the existing `orders`/`payment_events` tables

Add:
- `gateway text not null default 'cybersource'` (`'cybersource' | 'oapm'`) —
  lets one order table serve both rails.
- `oapm_out_trade_no text` — our stable merchant order number (see §4 note on
  why this is *not* the same concept as `reference_number`).
- `oapm_eft_trade_no text` — EFT's trade id; **set once, on first confirmed
  Sale response** — the idempotency guard (mirrors `cybersource_request_id`).
- `oapm_wallet text`, `oapm_pay_scene text`.

Same invariants as the card rail: amounts in integer HKD-cent minor units end
to end; CTP credited server-side exactly once, guarded on `oapm_eft_trade_no`,
only on a **verified** `TRADE_SUCCESS` from notify or query — never a browser
claim on its own (a redirect *can* carry a signed payload, per the §4
correction, but presence of query params isn't proof — only a verified
signature is, same bar as notify).

## 7. Setup status (2026-07-28, updated 2026-08-04)

- ✅ `OAPM_USER_CONFIRM_KEY`, `OAPM_SECRET`, `OAPM_BASE_URL` set in the
  Card Train Supabase project (`cdsrzczbnbhlmiebxzfb`) secrets store.
- ✅ Signing algorithm confirmed against EFT's official API docs
  (`oapm.eftpay.com.cn/oapm-docs/v1/`), not just the (buggy in places)
  Postman sample.
- ✅ **2026-08-04 — byte-verified against a real live response.** A manual
  Postman Alipay HK Sale (owner-run) returned a `TRADE_SUCCESS` redirect;
  recomputing `SHA256(secret + sorted params)` over its query fields
  reproduced the given `sign` exactly. Lowercase hex confirmed correct.
- ⬜ `oapm-checkout`'s own live fetch() (as opposed to the Postman client) is
  still unexercised end to end — the verification above came from a manual
  Postman call, not a call through our deployed function.

## 8. Known gaps/bugs in EFT's own reference material (do not blindly copy)

1. WeChat-WAP Postman sample defaults `pay_scene` to `"WEB"` — should be
   `"WAP"`. Set explicitly always.
2. `buyerType` is a **required** field per the official spec but is absent
   from every Postman sample request body — must be added.
3. Refund's `service` value disagrees between the field table
   (`service.common.Refund`) and the docs' own worked example
   (`service.alipay.web.Refund`) — confirm on first live call.
4. Postman collections never verify response/notify signatures — that logic
   doesn't exist as a reference implementation anywhere in the vendor
   material; ours is derived solely from the "Signature Verification" doc
   page.

## 9. Open questions (need Card Train / EFT support, not a build blocker)

1. **WECHATCN vs WECHATHK** — which wallet type does Card Train's account
   actually support? (Same shape as the CyberSource "which networks does the
   MID carry" question that GPAP had to answer.)
2. Exact `return_status`/`trade_status` full enum + merchant-facing message
   mapping — the docs reference an "Appendix 2" that wasn't reachable via the
   pages actually fetched; may need to ask EFT support directly, matching
   how the CyberSource reason-code table needed GPAP's confirmation.
3. `pay_scene` detection strategy (viewport width vs. user-agent) — a build
   decision, not a vendor question; default to user-agent sniffing, same as
   most WAP/WEB payment integrations.

## 10. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| No sandbox — every test is real money | High | Small fixed test amounts (HK$0.1–1.2) per the test plan; video + JSON evidence required by EFT anyway |
| ~~Signature algorithm unverified against a live response~~ | Resolved 2026-08-04 | Byte-verified against a real live `TRADE_SUCCESS` redirect (§7) |
| `return_url` carries no parameters | Medium (mitigated by design) | Never treat return_url as a state source; notify + query only |
| Refund `service` field ambiguity | Medium | Verify on first live refund call before the admin refund UI ships |
| Double-charge / double-credit on retry | High | Same invariant as CyberSource: idempotent on `oapm_eft_trade_no`, one successful Sale per order |
| Wallet type mismatch (WECHATCN vs HK) | Medium | Confirm with EFT support before the WeChat Pay button goes live |

## 11. Success criteria

- All applicable test-plan cases (PC WEB + Mobile WAP × Alipay HK/CN/WeChat,
  Sale + Refund, Query + Notify handling) pass with evidence submitted to
  EFT support.
- EFT confirms production bank-account routing is live.
- No double-charge / double-credit under retry, browser-close, or
  duplicate-notify tests.
- Buy Points and Shop goods both accept all three wallets on both pay scenes.
