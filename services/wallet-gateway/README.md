# Card Train — Wallet Gateway (PHP / Simple Order API)

A small server-to-server service that submits **Apple Pay** and **Google Pay**
transactions to CyberSource via the **Simple Order API** (SOAP + P12), which the
Deno/Supabase stack can't do. GPAP confirmed the wallet MIDs support Simple Order
only (not REST), so this is the sanctioned path.

```
Browser (Apple/Google Pay token)
  → Supabase edge fn (create-order, google-pay / apple-pay)   [owns order + points]
     → THIS service  /wallet/authorize  (X-Service-Key)
        → CyberSource Simple Order API (ics2wstest.ic3.com)   [official PHP SDK + P12]
```

Card Train's order state, points crediting and auth all stay in Supabase; this
service does one job — sign + submit the wallet transaction and return the result.
The P12 keys never leave this container.

## Endpoints (all POST except health, all require `X-Service-Key`)

| Route | Body | CyberSource |
|---|---|---|
| `GET /health` | — | — |
| `/wallet/authorize` | wallet, referenceCode, amount, currency, token, billTo, capture, cardType? | ccAuthService (+ccCaptureService if `capture`) |
| `/wallet/capture` | wallet, referenceCode, authRequestId, amount, currency | ccCaptureService |
| `/wallet/reverse` | wallet, referenceCode, authRequestId, amount, currency | ccAuthReversalService |
| `/wallet/refund` | wallet, referenceCode, captureRequestId, amount, currency | ccCreditService |

`wallet` is `apple` (paymentSolution 001, MID …202) or `google` (012, MID …201).
Reply: `{ decision, reasonCode, requestId, raw }`.

## Configuration (env → deploy-platform secrets, never committed)

See `.env.example`. The two wallet MIDs each have their own P12 transaction
security key; `docker-entrypoint.sh` decodes each from `CYBS_*_P12_BASE64` and
generates `config/cybs.<wallet>.ini` at start. `CYBS_ENV=test|production` selects
the `ics2ws` host + WSDL.

## Getting the P12 keys (per wallet MID)

In EBC → **Key Management** → generate a **Transaction Security Key** (P12) for
each MID (`…201`, `…202`), one for test now. Then base64 it for the env var:

```
base64 -i google-201.p12 | tr -d '\n'   # → CYBS_GOOGLE_P12_BASE64
base64 -i apple-202.p12  | tr -d '\n'   # → CYBS_APPLE_P12_BASE64
```

## Deploy (Railway)

```
railway up          # from services/wallet-gateway/ (Dockerfile build)
```
Set the env vars from `.env.example` as Railway variables. Then point the Supabase
edge functions at it:
```
supabase secrets set WALLET_GATEWAY_URL=https://<railway-url> \
  WALLET_SERVICE_KEY=<same value as the service> --project-ref cdsrzczbnbhlmiebxzfb
```

## ⚠️ Status

Scaffold complete; the Simple Order **field mapping is per the CyberSource guides**
and the config/auth/routing are done. **Pending to go live:**
- `composer install` needs network to pull `cybersource/sdk-php` (done at image build).
- The **P12 keys** for `…201` / `…202` (test).
- Finalize the one SDK boundary in `WalletGateway::send()` against the installed
  SDK version (how it locates `cybs.ini` — currently via `CYBS_INI`).
- For Apple Pay: the Apple Developer account, Merchant Identity cert, domain
  registration + `/.well-known/` file (handled on the front-end/site side).
