// Card network detection → CyberSource `card_type` codes.
//
// Only networks the MID is actually provisioned for may be accepted. Sending a
// card_type the processor doesn't support is rejected with reason_code 102
// ("This card is not supported by the processor.: card_type") — and because 102
// is a validation reject, no transaction is created and it cannot be found in
// the Business Center at all. So a network stays off here until GPAP enables it.
//
// Verified against the sandbox on MID gphk088034609200 (2026-08-04):
//   Visa 001       -> reason 100 ✅
//   Mastercard 002 -> reason 100 ✅
//   UnionPay 062   -> reason 102 ❌ "not supported by the processor"
//
// UnionPay is implemented and tested, but gated off. Once GPAP enables it on the
// MID (and it is ticked on the Secure Acceptance profile, then PROMOTED), turn it
// on with VITE_ENABLE_UNIONPAY=true — no code change.

export const CARD_TYPE = {
  visa: '001',
  mastercard: '002',
  unionPay: '062',
} as const;

export interface NetworkOptions {
  /** Accept China UnionPay. Requires GPAP to have enabled it on the MID. */
  unionPay?: boolean;
}

const UNIONPAY_ENABLED = import.meta.env?.VITE_ENABLE_UNIONPAY === 'true';

/** CyberSource card_type for a card number, or undefined if we can't accept it. */
export function detectCardType(
  cardNumber: string,
  opts: NetworkOptions = { unionPay: UNIONPAY_ENABLED },
): string | undefined {
  const n = cardNumber.replace(/\D/g, '');
  if (/^4/.test(n)) return CARD_TYPE.visa;
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return CARD_TYPE.mastercard;
  // UnionPay: 62xxxx, plus the 81xxxx range issued in some markets.
  if (opts.unionPay && /^(62|81)/.test(n)) return CARD_TYPE.unionPay;
  return undefined;
}
