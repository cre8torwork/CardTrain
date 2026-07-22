// CyberSource REST API HTTP Signature authentication (Deno + Node, Web Crypto).
//
// For a POST, sign these headers in this order:
//   host, date, (request-target), digest, v-c-merchant-id
// - digest = "SHA-256=" + base64( SHA-256(body) )   (POST only)
// - signature = base64( HMAC-SHA256( signatureBaseString, base64decode(sharedSecret) ) )
// - the shared secret is a Base64 string; decode it before using as the HMAC key.
//
// The Signature header the request sends:
//   keyid="<keyId>", algorithm="HmacSHA256",
//   headers="host date (request-target) digest v-c-merchant-id", signature="<sig>"

const enc = new TextEncoder();

const SIGNED_HEADERS = 'host date (request-target) digest v-c-merchant-id';

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Message digest header value for a POST body: "SHA-256=" + base64(SHA-256(body)). */
export async function digestFor(body: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(body));
  return 'SHA-256=' + bytesToB64(new Uint8Array(hash));
}

export interface SignatureParams {
  host: string;
  date: string; // RFC 7231 HTTP-date
  requestTarget: string; // "post /pts/v2/payments"
  digest: string; // from digestFor()
  merchantId: string;
}

/** The exact multi-line string that gets HMAC-signed. */
export function buildSignatureString(p: SignatureParams): string {
  return [
    `host: ${p.host}`,
    `date: ${p.date}`,
    `(request-target): ${p.requestTarget}`,
    `digest: ${p.digest}`,
    `v-c-merchant-id: ${p.merchantId}`,
  ].join('\n');
}

/** The full `Signature` header value for a POST request. */
export async function signatureHeader(
  p: SignatureParams,
  keyId: string,
  sharedSecretB64: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    b64ToBytes(sharedSecretB64),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(buildSignatureString(p)));
  const signature = bytesToB64(new Uint8Array(sig));
  return `keyid="${keyId}", algorithm="HmacSHA256", headers="${SIGNED_HEADERS}", signature="${signature}"`;
}
