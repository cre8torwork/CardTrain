const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32ToBytes(base32: string): Uint8Array {
  const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  const bits: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (val === -1) continue;
    const binary = val.toString(2).padStart(5, '0');
    bits.push(...binary.split('').map(Number));
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i * 8 + j] || 0);
    }
    bytes[i] = byte;
  }
  return bytes;
}

function bytesToBase32(bytes: Uint8Array): string {
  let bits = '';
  for (let i = 0; i < bytes.length; i++) {
    bits += bytes[i].toString(2).padStart(8, '0');
  }
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, '0');
    result += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  const pad = (8 - (result.length % 8)) % 8;
  return result + '='.repeat(pad);
}

function longToBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = n & 0xff;
    n = Math.floor(n / 256);
  }
  return bytes;
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return new Uint8Array(signature);
}

function dynamicTruncation(hmac: Uint8Array): number {
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return binary % 1000000;
}

export function generateSecret(length: number = 20): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToBase32(bytes);
}

export async function verifyTotp(secret: string, code: string, timeStep: number = 30, window: number = 1): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / timeStep);

  for (let i = -window; i <= window; i++) {
    const currentCounter = counter + i;
    const counterBytes = longToBytes(currentCounter);
    const secretBytes = base32ToBytes(secret);
    const hmac = await hmacSha1(secretBytes, counterBytes);
    const generated = dynamicTruncation(hmac).toString().padStart(6, '0');
    if (generated === code) return true;
  }
  return false;
}

export function generateOtpAuthUri(secret: string, label: string, issuer: string = 'CardTrain'): string {
  const encodedLabel = encodeURIComponent(label);
  const encodedIssuer = encodeURIComponent(issuer);
  // 標準 otpauth 格式：path 為 label，issuer 透過 query param 傳遞
  return `otpauth://totp/${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

export function getQrCodeUrl(otpauthUri: string, size: number = 200): string {
  const encoded = encodeURIComponent(otpauthUri);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}