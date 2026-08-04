// EFT Payments OAPM request signing and notify/response signature verification.
//
// Signing contract (per EFT's official OAPM API docs, 2026-07-28 — not just the
// Postman sample, which has gaps/bugs; see
// docs/superpowers/specs/2026-07-28-cardtrain-oapm-design.md §4 and §8):
//   asciiParamString = every field except "sign", ASCII-sorted by key, joined as
//                       `key=value&key=value...` (no delimiter before secret_code)
//   sign = SHA256( secret_code + asciiParamString )
//
// Same algorithm both directions: signing our outbound requests (Sale/Refund/Query)
// and verifying inbound notify webhooks.
//
// Uses Web Crypto so this module runs in Deno (edge runtime) and Node (tests) —
// same dual-runtime pattern as secure-acceptance.ts.
//
// ✅ VERIFIED 2026-08-04: byte-matched against a real live EFT redirect (a manual
// Postman Alipay HK Sale, TRADE_SUCCESS). Recomputing SHA256(secret + sorted
// params) over the return_url's query fields reproduced its `sign` exactly.
// Lowercase hex confirmed correct (design spec §7, §10 risk #2 — resolved).

const enc = new TextEncoder();

/** Sort every field except "sign", ASCII order, and join as key=value&key=value. */
export function buildAsciiParamString(fields: Record<string, string>): string {
  return Object.keys(fields)
    .filter((k) => k !== 'sign')
    .sort() // default JS string sort is UTF-16 code-unit order — matches ASCII dictionary order for this field-name set
    .map((k) => `${k}=${fields[k] ?? ''}`)
    .join('&');
}

/** Lowercase hex SHA-256 digest — see the ⚠️ note above on the unverified encoding. */
export async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(data));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** sign = SHA256(secret_code + asciiParamString). No delimiter before secret_code. */
export async function signOapmFields(
  fields: Record<string, string>,
  secretCode: string,
): Promise<string> {
  return sha256Hex(secretCode + buildAsciiParamString(fields));
}

/** Constant-time string comparison to avoid signature-timing leaks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Recompute the sign over every field but "sign" and compare (request or notify payload). */
export async function verifyOapmSignature(
  fields: Record<string, string>,
  secretCode: string,
): Promise<boolean> {
  if (!fields.sign) return false;
  const expected = await signOapmFields(fields, secretCode);
  return timingSafeEqual(expected, fields.sign);
}
