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

/**
 * Billing-address fields, in signing order.
 *
 * The UnionPay merchant (…204) runs a HOSTED CHECKOUT Secure Acceptance profile,
 * whose own payment page collects a billing address and therefore makes it
 * mandatory. Posting to the Checkout API endpoint (/silent/pay) against that
 * profile skips the page but NOT the requirement, so the authorization is
 * rejected with reason_code 101 naming `bill_address1, bill_city, bill_country`.
 * Those are the internal Simple Order names — which is why grepping the codebase
 * for them finds nothing; we send the `bill_to_address_*` spellings below.
 * Visa/Mastercard (…200) is a Checkout API profile and never required them,
 * which is why that network worked from the start.
 */
export const BILLING_ADDRESS_FIELD_NAMES = [
  'bill_to_address_line1',
  'bill_to_address_city',
  'bill_to_address_country',
] as const;

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
  'payment_method',
  'bill_to_forename',
  'bill_to_surname',
  'bill_to_email',
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
  paymentMethod: string; // "card"
  // Required for card transactions; known server-side for a logged-in user.
  // The address parts are only known for orders that captured one (shop goods);
  // supply all three or none — a partial address is worse than none, because
  // CyberSource then reports a different missing field on every attempt.
  billTo: {
    forename: string;
    surname: string;
    email: string;
    addressLine1?: string;
    city?: string;
    country?: string; // ISO 3166-1 alpha-2, e.g. "HK"
  };
  /**
   * The merchant's profile makes a billing address mandatory (UnionPay/…204).
   * When we have no address to sign, the three fields are declared UNSIGNED so
   * the browser form can collect them — an unsigned field is still covered by
   * the signature, because `unsigned_field_names` is itself signed, so a
   * customer can add an address but cannot add a field we did not allow.
   *
   * Ignored under `hosted`, where CyberSource's own page collects the address.
   */
  requireBillingAddress?: boolean;
  /**
   * Which Secure Acceptance integration this field set is built for.
   *
   * `hosted` (Hosted Checkout, POST /pay) means CyberSource collects the card —
   * and any missing billing address — on its own page, so we must declare NO
   * unsigned fields at all. Declaring card fields we then never send is not
   * harmless: every name in `unsigned_field_names` must be PRESENT in the POST or
   * the gateway answers 403 on every endpoint, which looks exactly like a
   * misconfigured profile and sends you chasing the wrong thing.
   *
   * Defaults to `checkout_api` (Silent Order POST, /silent/pay) — the Visa/
   * Mastercard path, whose signature must stay byte-identical.
   */
  integration?: 'checkout_api' | 'hosted';
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
  // All three, or none: sign the address when the order carries one, otherwise
  // let the browser supply it (only when the profile actually demands it).
  const address = {
    bill_to_address_line1: input.billTo.addressLine1?.trim() ?? '',
    bill_to_address_city: input.billTo.city?.trim() ?? '',
    bill_to_address_country: input.billTo.country?.trim() ?? '',
  };
  const haveAddress = BILLING_ADDRESS_FIELD_NAMES.every((n) => address[n]);
  const hosted = input.integration === 'hosted';
  const signedNames = haveAddress
    ? [...SIGNED_FIELD_NAMES, ...BILLING_ADDRESS_FIELD_NAMES]
    : [...SIGNED_FIELD_NAMES];
  // Hosted Checkout collects the CARD on CyberSource's own page, so we never
  // declare card fields for it. It does NOT collect a billing address, though —
  // the …204 hosted payment page renders card fields only, while the profile
  // still mandates an address, so sending none fails the authorization with
  // reason_code 101 [bill_address1, bill_city, bill_country]. When the order
  // carries no address we therefore declare those three UNSIGNED under hosted
  // too, and our own form collects them before the handoff.
  const unsignedNames = hosted
    ? (!haveAddress && input.requireBillingAddress
      ? BILLING_ADDRESS_FIELD_NAMES.join(',')
      : '')
    : !haveAddress && input.requireBillingAddress
    ? [UNSIGNED_FIELD_NAMES, ...BILLING_ADDRESS_FIELD_NAMES].join(',')
    : UNSIGNED_FIELD_NAMES;

  const fields: Record<string, string> = {
    access_key: input.accessKey,
    profile_id: input.profileId,
    transaction_uuid: input.transactionUuid,
    signed_field_names: signedNames.join(','),
    unsigned_field_names: unsignedNames,
    signed_date_time: input.signedDateTime,
    locale: input.locale,
    transaction_type: input.transactionType,
    reference_number: input.referenceNumber,
    amount: input.amount,
    currency: input.currency,
    payment_method: input.paymentMethod,
    bill_to_forename: input.billTo.forename,
    bill_to_surname: input.billTo.surname,
    bill_to_email: input.billTo.email,
    ...(haveAddress ? address : {}),
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
