// CyberSource Secure Acceptance (Checkout API / Silent Order POST) request
// signing and response-signature verification.
//
// Signing contract (must byte-match CyberSource's integration guide):
//   dataToSign = each field in `signed_field_names`, as `name=value`, joined by ","
//   signature  = Base64( HMAC-SHA256( secretKey, dataToSign ) )
//
// Uses Web Crypto so the same module runs in Deno (edge runtime) and Node (tests).
// The secret key lives only in server-side env; card fields (card_number, card_cvn,
// card_expiry_date, card_type) are UNSIGNED and are added by the browser, never here.

const enc = new TextEncoder();

/** Fields whose values the customer types in the browser; never signed, never server-side. */
export const UNSIGNED_FIELD_NAMES = 'card_type,card_number,card_expiry_date,card_cvn';

/** The signed fields, in the exact order they are signed. */
const SIGNED_FIELD_NAMES = [
  'access_key',
  'profile_id',
  'transaction_uuid',
  'signed_field_names',
  'unsigned_field_names',
  'signed_date_time',
  'locale',
  'transaction_type',
  'reference_number',
  'amount',
  'currency',
] as const;

export interface SignedRequestInput {
  accessKey: string;
  profileId: string;
  transactionUuid: string;
  signedDateTime: string; // yyyy-MM-dd'T'HH:mm:ss'Z'
  locale: string;
  transactionType: 'sale' | 'authorization';
  referenceNumber: string;
  amount: string; // decimal string, e.g. "10.00"
  currency: string; // "HKD"
}

/** Build the exact string that gets HMAC-signed, in signed_field_names order. */
export function buildDataToSign(fields: Record<string, string>): string {
  return fields.signed_field_names
    .split(',')
    .map((name) => `${name}=${fields[name] ?? ''}`)
    .join(',');
}

/** Base64( HMAC-SHA256( secretKey, data ) ). */
export async function hmacSha256Base64(secretKey: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** Assemble the full signed request field map (without card fields) ready to POST. */
export async function buildSignedRequestFields(
  input: SignedRequestInput,
  secretKey: string,
): Promise<Record<string, string>> {
  const fields: Record<string, string> = {
    access_key: input.accessKey,
    profile_id: input.profileId,
    transaction_uuid: input.transactionUuid,
    signed_field_names: SIGNED_FIELD_NAMES.join(','),
    unsigned_field_names: UNSIGNED_FIELD_NAMES,
    signed_date_time: input.signedDateTime,
    locale: input.locale,
    transaction_type: input.transactionType,
    reference_number: input.referenceNumber,
    amount: input.amount,
    currency: input.currency,
  };
  fields.signature = await hmacSha256Base64(secretKey, buildDataToSign(fields));
  return fields;
}

/** Constant-time string comparison to avoid signature-timing leaks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Recompute the signature over the response's own signed_field_names and compare. */
export async function verifyResponseSignature(
  fields: Record<string, string>,
  secretKey: string,
): Promise<boolean> {
  if (!fields.signature || !fields.signed_field_names) return false;
  const expected = await hmacSha256Base64(secretKey, buildDataToSign(fields));
  return timingSafeEqual(expected, fields.signature);
}
